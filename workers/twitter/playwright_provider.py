"""
X (Twitter) Playwright Provider - koleksi via browser dengan sesi cookie.

Provider development: memakai browser Playwright + sesi cookie ekspor
Netscape (twitter_cookies.txt) tanpa username/password. Setelah cookie
dimuat dan sesi terverifikasi, storage state Playwright disimpan ke
twitter_state.json agar run berikutnya lebih cepat.

Alur sesi (TwitterSession):
1. Jika twitter_state.json ada DAN valid -> restore ("Session restored").
2. Jika tidak ada / invalid / kedaluwarsa -> bangun ulang dari file cookie
   Netscape (TwitterCookieManager), verifikasi login di x.com/home, lalu
   simpan state baru otomatis.
3. Jika cookie hilang/kedaluwarsa -> error jelas, job worker ditandai failed.

Pencarian per keyword: https://x.com/search?q=<query>&f=live (tab Latest),
scroll hingga max_scrolls atau max_posts_per_keyword tercapai, lalu parse
article[data-testid="tweet"] ke struktur post data yang SAMA dengan
provider API (lihat normalize_tweet di api_provider.py).

Catatan: DOM X tidak menyediakan user id numerik, sehingga platform_user_id
dipakai username (kunci dedup stabil). Nilai ini sengaja dibedakan dari
provider API yang memakai author_id numerik.

Credential cookie TIDAK PERNAH dicetak ke log / error message.
"""

from __future__ import annotations

import asyncio
import json
import re
import time
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from loguru import logger

from shared.browser import PlaywrightManager
from shared.cookies import parse_netscape_cookies

from twitter.cookies import (
    TwitterCookieManager,
    TwitterCookieExpired,
    TwitterCookieFileMissing,
    TwitterSessionInvalid,
)

X_HOME = "https://x.com/home"
X_SEARCH_URL = "https://x.com/search"
SESSION_COOKIE_NAMES = ("auth_token", "ct0")

# User-Agent desktop real agar halaman X tidak menolak sesi headless
X_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

# Skrip evaluasi DOM article -> dict terstruktur (dijalankan di halaman)
EXTRACT_ARTICLES_JS = """
() => {
  const out = [];
  const parseCompact = (s) => {
    let t = String(s).replace(/,/g, '').trim().toUpperCase();
    let mult = 1;
    if (t.endsWith('K')) { mult = 1000; t = t.slice(0, -1); }
    else if (t.endsWith('M')) { mult = 1000000; t = t.slice(0, -1); }
    else if (t.endsWith('B')) { mult = 1000000000; t = t.slice(0, -1); }
    const n = parseFloat(t);
    return isNaN(n) ? 0 : Math.round(n * mult);
  };
  const metricsFromLabels = (article) => {
    const m = { likes: 0, replies: 0, reposts: 0, views: 0 };
    article.querySelectorAll('[aria-label]').forEach((el) => {
      const label = el.getAttribute('aria-label') || '';
      const match = label.match(/^([\\d.,]+[KMB]?)\\s*(likes?|reposts?|replies?|views?)$/i);
      if (!match) return;
      const n = parseCompact(match[1]);
      const key = match[2].toLowerCase();
      if (key.startsWith('like')) m.likes = n;
      else if (key.startsWith('repost')) m.reposts = n;
      else if (key.startsWith('repl')) m.replies = n;
      else if (key.startsWith('view')) m.views = n;
    });
    // Fallback: tombol aksi di timeline berisi angka count sebagai teks
    const btnMetric = (sel) => {
      const el = article.querySelector(sel);
      if (!el) return 0;
      const t = (el.innerText || '').trim();
      const mm = t.match(/([\\d.,]+[KMB]?)/i);
      return mm ? parseCompact(mm[1]) : 0;
    };
    if (m.likes === 0) m.likes = btnMetric('[data-testid="like"]');
    if (m.replies === 0) m.replies = btnMetric('[data-testid="reply"]');
    if (m.reposts === 0) m.reposts = btnMetric('[data-testid="retweet"]');
    if (m.views === 0) {
      article.querySelectorAll('[data-testid="app-text-transition-container"]').forEach((el) => {
        const t = (el.innerText || '').trim();
        const vm = t.match(/^([\\d.,]+[KMB]?)\\s*views?$/i);
        if (vm) m.views = parseCompact(vm[1]);
      });
    }
    return m;
  };
  document.querySelectorAll('article[data-testid="tweet"]').forEach((article) => {
    const item = {
      id: '', username: '', fullName: '', avatar: '',
      text: '', time: '', verified: false, reposted: false,
      media: [], videoPoster: '',
      likes: 0, replies: 0, reposts: 0, views: 0,
    };

    const statusLink = article.querySelector('a[href*="/status/"]');
    if (statusLink) {
      const match = (statusLink.getAttribute('href') || '').match(/^\\/([^/]+)\\/status\\/(\\d+)/);
      if (match) { item.username = match[1]; item.id = match[2]; }
    }

    const textEl = article.querySelector('[data-testid="tweetText"]');
    if (textEl) item.text = textEl.innerText;

    const timeEl = article.querySelector('time');
    if (timeEl) item.time = timeEl.getAttribute('datetime') || '';

    const nameEl = article.querySelector('[data-testid="User-Name"]');
    if (nameEl) {
      const a = nameEl.querySelector('a span');
      if (a) item.fullName = a.innerText;
    }

    const avatarImg = article.querySelector('[data-testid="Tweet-User-Avatar"] img');
    if (avatarImg) item.avatar = avatarImg.getAttribute('src') || '';

    if (article.querySelector('[aria-label="Verified account"], svg[data-testid="icon-verified"]')) {
      item.verified = true;
    }

    const social = article.querySelector('[data-testid="socialContext"]');
    if (social && /repost/i.test(social.innerText || '')) item.reposted = true;

    const seen = new Set();
    article.querySelectorAll('img[src*="pbs.twimg.com/media/"]').forEach((img) => {
      const src = img.getAttribute('src') || '';
      if (src && src.startsWith('http') && !seen.has(src)) {
        seen.add(src);
        item.media.push(src);
      }
    });
    const video = article.querySelector('video[poster]');
    if (video) item.videoPoster = video.getAttribute('poster') || '';

    const metrics = metricsFromLabels(article);
    item.likes = metrics.likes;
    item.replies = metrics.replies;
    item.reposts = metrics.reposts;
    item.views = metrics.views;

    out.push(item);
  });
  return out;
}
"""


class TwitterSession:
    """Sesi autentikasi X (Twitter) dengan persistensi storage state."""

    def __init__(
        self,
        storage_state_file: Path,
        cookies_file: Path,
        timeout_ms: int,
    ):
        self.storage_state_file = Path(storage_state_file)
        self.cookies_file = Path(cookies_file)
        self.timeout_ms = timeout_ms
        self.cookie_manager = TwitterCookieManager(self.cookies_file)
        self._context: Optional[Any] = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def get_context(self, browser: PlaywrightManager) -> Any:
        """Dapatkan BrowserContext yang terautentikasi (state atau cookies)."""
        if self.storage_state_file.exists():
            context = await self._restore_from_state(browser)
            if context is not None:
                self._context = context
                return context
            logger.warning(
                "Storage state tidak valid/kedaluwarsa - "
                "membangun ulang dari file cookies..."
            )

        context = await self._build_from_cookies(browser)
        self._context = context
        return context

    async def save_state(self, context: Optional[Any] = None) -> None:
        """Simpan storage state saat ini ke twitter_state.json."""
        context = context or self._context
        if context is None:
            return
        try:
            self.storage_state_file.parent.mkdir(parents=True, exist_ok=True)
            await context.storage_state(path=str(self.storage_state_file))
            logger.info(
                f"Storage state disimpan: {self.storage_state_file}"
            )
        except Exception as e:
            logger.warning(f"Gagal menyimpan storage state: {e}")

    async def close_context(self) -> None:
        if self._context is not None:
            try:
                await self._context.close()
            except Exception:
                pass
            self._context = None

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    async def _restore_from_state(self, browser: PlaywrightManager) -> Optional[Any]:
        """Coba restore context dari storage state. None jika gagal/kedaluwarsa."""
        logger.info("Loading storage state...")
        try:
            state = json.loads(self.storage_state_file.read_text("utf-8"))
        except (OSError, json.JSONDecodeError) as e:
            logger.warning(f"Storage state tidak terbaca ({e})")
            return None

        if not self._state_has_valid_session(state):
            return None

        try:
            context = await browser.new_context(
                storage_state=str(self.storage_state_file)
            )
        except Exception as e:
            logger.warning(f"Gagal restore storage state ({e})")
            return None

        if await self.is_logged_in(context):
            logger.info("Session restored.")
            return context

        try:
            await context.close()
        except Exception:
            pass
        return None

    def _state_has_valid_session(self, state: dict) -> bool:
        """Cek cookie sesi (auth_token/ct0) di storage state dan kedaluwarsanya."""
        cookies = state.get("cookies") or []
        now = time.time()
        found: dict = {}
        for c in cookies:
            if c.get("name") in SESSION_COOKIE_NAMES:
                found[c["name"]] = c
        if not all(name in found for name in SESSION_COOKIE_NAMES):
            return False
        for c in found.values():
            expires = c.get("expires", 0) or 0
            # Playwright bisa mengekspor expires=-1 untuk cookie sesi
            if 0 < expires < now:
                return False
        return True

    async def _build_from_cookies(self, browser: PlaywrightManager) -> Any:
        """Bangun context baru dari file cookie Netscape + verifikasi login."""
        playwright_cookies = self.cookie_manager.load_playwright_cookies()
        parsed = parse_netscape_cookies(self.cookies_file)
        self.cookie_manager.validate_parsed(parsed)

        context = await browser.new_context(
            viewport={"width": 1280, "height": 800}
        )
        await context.add_cookies(playwright_cookies)

        await self._verify_login(context)

        # Sesuai spec: simpan storage state agar run berikutnya lebih cepat
        await self.save_state(context)
        return context

    async def _verify_login(self, context: Any) -> None:
        """Buka x.com dan pastikan sesi benar-benar login.

        Mengecek cookie sesi di context + tidak diarahkan ke halaman login.
        """
        page = await context.new_page()
        try:
            await page.goto(
                X_HOME,
                wait_until="domcontentloaded",
                timeout=self.timeout_ms,
            )
        except Exception as e:
            await page.close()
            raise TwitterSessionInvalid(
                f"Gagal membuka x.com untuk verifikasi sesi: {e}"
            ) from e

        try:
            has_session = await self._context_has_session_cookies(context)
            login_wall = await self._page_is_login_wall(page)
            if login_wall or not has_session:
                raise TwitterSessionInvalid(
                    "Sesi X TIDAK valid - halaman meminta login. "
                    "Cookie tidak dikenali X.\n"
                    "Ekspor ulang cookie (pastikan SUDAH login di browser) "
                    f"dan ganti isi {self.cookies_file}."
                )
            logger.info("Sesi X terverifikasi (login aktif).")
        finally:
            await page.close()

    @staticmethod
    async def _page_is_login_wall(page: Any) -> bool:
        """Deteksi halaman login / alur login X."""
        try:
            if "/login" in page.url or "i/flow/login" in page.url:
                return True
            if await page.locator('[data-testid="loginButton"]').count() > 0:
                return True
            if await page.locator('input[name="text"]').count() > 0:
                return True
        except Exception:
            return False
        return False

    async def _context_has_session_cookies(self, context: Any) -> bool:
        cookies = await context.cookies("https://x.com")
        names = {c["name"] for c in cookies}
        return all(name in names for name in SESSION_COOKIE_NAMES)

    async def is_logged_in(self, context: Any) -> bool:
        """Cek cepat (tanpa navigasi) apakah context masih login."""
        try:
            return await self._context_has_session_cookies(context)
        except Exception:
            return False

    async def rebuild(self, browser: PlaywrightManager) -> Any:
        """Tutup context lama dan bangun ulang dari cookie file."""
        await self.close_context()
        self._context = await self._build_from_cookies(browser)
        return self._context


class XPlaywrightProvider:
    """Provider koleksi X via Playwright + sesi cookie (development)."""

    def __init__(self, worker):
        self.worker = worker
        self.timeout_ms = max(10000, worker.timeout_seconds * 1000)
        self.max_scrolls = worker.max_scrolls
        self.max_posts_per_keyword = worker.max_posts_per_keyword
        self.exclude_retweets = worker.exclude_retweets
        self.lang_filter = worker.lang_filter

        self.browser = PlaywrightManager(
            headless=worker.headless,
            timeout_ms=self.timeout_ms,
            user_agent=X_USER_AGENT,
        )
        self.session = TwitterSession(
            storage_state_file=worker.storage_state_file,
            cookies_file=worker.cookies_file,
            timeout_ms=self.timeout_ms,
        )
        self._context: Optional[Any] = None
        self._page: Optional[Any] = None

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def prepare(self) -> Optional[str]:
        """Cek prasyarat statis (playwright + file cookie). None jika siap."""
        try:
            import playwright  # noqa: F401
        except ImportError:
            return (
                "X worker dihentikan: playwright tidak tersedia "
                "(pip install playwright && playwright install chromium)"
            )
        try:
            self.session.cookie_manager.load_playwright_cookies()
            parsed = parse_netscape_cookies(self.session.cookies_file)
            self.session.cookie_manager.validate_parsed(parsed)
        except (
            TwitterCookieFileMissing,
            TwitterCookieExpired,
            TwitterSessionInvalid,
        ) as e:
            return f"X worker dihentikan: {e}"
        return None

    async def initialize(self) -> None:
        """Launch browser, siapkan sesi terautentikasi, buka halaman kerja."""
        logger.info("Meluncurkan browser Playwright untuk X (Twitter)...")
        await self.browser.start()
        self._context = await self.session.get_context(self.browser)
        self._page = await self._context.new_page()

    async def close(self) -> None:
        """Tutup page, context, dan browser."""
        for coro in (
            self._page.close() if self._page else None,
            self.session.close_context(),
            self.browser.close(),
        ):
            if coro is None:
                continue
            try:
                await coro
            except Exception:
                pass
        self._page = None
        self._context = None

    # ------------------------------------------------------------------
    # Query & Normalisasi
    # ------------------------------------------------------------------

    def build_search_query(self, keyword: str) -> str:
        """Bangun query X search (URL-encoded) dari keyword.

        Operator pencarian sama dengan build_query provider API: frasa eksak
        untuk keyword berspasi, plus -is:retweet / lang: bila dikonfigurasi.
        """
        keyword = keyword.strip()
        if not keyword:
            return ''

        query = keyword
        if ' ' in keyword:
            query = f'"{keyword}"'

        if self.exclude_retweets:
            query = f"{query} -is:retweet"

        if self.lang_filter:
            query = f"{query} lang:{self.lang_filter}"

        return urllib.parse.quote(query)

    def normalize_article(
        self, item: Dict[str, Any], keyword: str
    ) -> Optional[Dict[str, Any]]:
        """Map article X (hasil evaluasi DOM) ke worker post data.

        Struktur output SAMA dengan normalize_tweet provider API.
        """
        post_id = str(item.get('id') or '')
        if not post_id:
            return None

        username = (item.get('username') or '').lower()
        full_name = item.get('fullName') or username or ''
        profile_picture_url = item.get('avatar') or ''

        content = item.get('text') or ''
        posted_at = None
        time_raw = item.get('time')
        if time_raw:
            try:
                parsed = datetime.fromisoformat(
                    time_raw.replace('Z', '+00:00')
                )
                posted_at = parsed.astimezone(timezone.utc).replace(tzinfo=None)
            except (ValueError, TypeError) as e:
                logger.warning(
                    f"Tweet {post_id} waktu tidak valid ({time_raw}): {e}"
                )

        if not posted_at:
            return None

        media_urls: List[str] = []
        for url in item.get('media') or []:
            if url and url not in media_urls:
                media_urls.append(url)
        video_poster = item.get('videoPoster') or ''
        if video_poster and video_poster not in media_urls:
            media_urls.append(video_poster)

        if username:
            post_url = f"https://x.com/{username}/status/{post_id}"
        else:
            post_url = f"https://x.com/i/web/status/{post_id}"

        return {
            'platform_user_id': username,  # DOM tidak menyediakan user id numerik
            'username': username,
            'full_name': full_name,
            'profile_picture_url': profile_picture_url,
            'followers_count': 0,  # tidak tersedia di halaman pencarian
            'is_verified': bool(item.get('verified')),

            'platform_post_id': post_id,
            'post_type': 'post',
            'content': content,
            'media_urls': media_urls,
            'post_url': post_url,

            'likes_count': item.get('likes', 0),
            'comments_count': item.get('replies', 0),
            'shares_count': item.get('reposts', 0),
            'views_count': item.get('views', 0),

            'location': '',
            'posted_at': posted_at,

            'metadata': {
                'source': 'x-playwright',
                'keyword': keyword,
                'is_retweet': bool(item.get('reposted')),
            },
        }

    # ------------------------------------------------------------------
    # Scraping
    # ------------------------------------------------------------------

    async def search_keyword(self, keyword: str) -> List[Dict[str, Any]]:
        """Scrape tweet terbaru untuk keyword dari halaman search X."""
        query = self.build_search_query(keyword)
        if not query:
            logger.error(f"Keyword '{keyword}' menghasilkan query X kosong")
            return []

        url = f"{X_SEARCH_URL}?q={query}&f=live&src=typed_query"
        logger.info(f"Scraping X keyword: {keyword} (query: {query})")

        page = self._page
        if page is None:
            logger.error("Halaman X belum dibuka - initialize() belum dipanggil")
            self.worker.failures.append("Playwright provider belum di-initialize")
            return []

        try:
            await page.goto(
                url,
                wait_until="domcontentloaded",
                timeout=self.timeout_ms,
            )
        except Exception as e:
            logger.error(f"Gagal membuka halaman search X untuk '{keyword}': {e}")
            self.worker.failures.append(f"Gagal membuka halaman search X: {e}")
            return []

        if await self.session._page_is_login_wall(page):
            raise TwitterSessionInvalid(
                "Sesi X berakhir saat pencarian - halaman meminta login. "
                "Ekspor ulang cookie dan ganti isi "
                f"{self.session.cookies_file}."
            )

        # Tunggu timeline muncul; tidak ada hasil = keyword tanpa tweet baru
        try:
            await page.wait_for_selector(
                'article[data-testid="tweet"]',
                timeout=min(self.timeout_ms, 20000),
            )
        except Exception:
            logger.info(f"Tidak ada tweet ditemukan untuk '{keyword}'")
            return []

        return await self._collect_posts(page, keyword)

    async def _collect_posts(
        self, page: Any, keyword: str
    ) -> List[Dict[str, Any]]:
        """Scroll halaman, parse article, normalisasi + dedup post."""
        posts_data: List[Dict[str, Any]] = []
        parsed_ids: set = set()

        for scroll in range(self.max_scrolls + 1):
            try:
                items = await page.evaluate(EXTRACT_ARTICLES_JS)
            except Exception as e:
                logger.warning(f"Gagal mengekstrak tweet dari halaman: {e}")
                break

            for item in items:
                if not isinstance(item, dict):
                    continue
                post_id = str(item.get('id') or '')
                if not post_id or post_id in parsed_ids:
                    continue
                parsed_ids.add(post_id)
                if post_id in self.worker.seen_post_ids:
                    logger.debug(f"Tweet {post_id} sudah diproses - dilewati")
                    continue
                if self.exclude_retweets and item.get('reposted'):
                    logger.debug(f"Tweet {post_id} retweet - dilewati")
                    continue
                try:
                    post_data = self.normalize_article(item, keyword)
                except Exception as e:
                    logger.warning(f"Tweet {post_id} gagal dinormalisasi: {e}")
                    continue
                if post_data is None:
                    continue
                posts_data.append(post_data)
                self.worker.seen_post_ids.add(post_id)
                if len(posts_data) >= self.max_posts_per_keyword:
                    break

            if len(posts_data) >= self.max_posts_per_keyword:
                break

            if scroll < self.max_scrolls:
                await page.mouse.wheel(0, 4000)
                await asyncio.sleep(1.5)

        logger.info(f"Scraped {len(posts_data)} post baru untuk '{keyword}'")
        return posts_data
