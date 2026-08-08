"""
Scraper halaman Facebook (public pages) dengan Playwright.

Alur per halaman:
1. Normalisasi URL halaman -> https://www.facebook.com/{username}/
2. Buka halaman ("Opening page..."), tangani dialog cookie/prompt login.
3. Scroll bertahap ("Scrolling...") sambil mengumpulkan elemen artikel.
4. Parse tiap artikel -> RawPost (dedupe oleh post URL).
5. Ambil metadata halaman (nama via og:title, avatar via og:image).

Sesi yang mati di tengah jalan (login wall muncul) memicu
FacebookSessionExpired - worker akan membangun ulang sesi dari cookie file
lalu mengulang halaman tersebut sekali.
"""

from __future__ import annotations

import re
from typing import Dict, List, Tuple
from urllib.parse import urlparse

from loguru import logger

from shared.retry import retry_async

from .models import RawPost


class FacebookSessionExpired(Exception):
    """Sesi Facebook mati di tengah scraping (login wall / redirect login)."""


# Artikel/baris postingan. Facebook memakai dua layout:
# 1. `div[aria-posinset]` - baris postingan virtualized (layout baru)
# 2. `div[role="article"]` - artikel klasik (layout lama)
# Eksklusi :has() menghindari placeholder skeleton loading ("Loading...").
POST_ROW_SELECTOR = (
    'div[aria-posinset], '
    'div[role="article"]:not(:has([aria-label="Loading..."]))'
)


class FacebookScraper:
    """Scrape postingan publik dari halaman Facebook."""

    def __init__(self, config, session, parser):
        self.config = config
        self.session = session
        self.parser = parser

    # ------------------------------------------------------------------
    # URL handling
    # ------------------------------------------------------------------

    @staticmethod
    def page_username(page_url: str) -> str:
        """Ekstrak username/handle dari URL atau input pengguna."""
        value = page_url.strip()
        if value.startswith("@"):
            return value[1:].strip("/")
        if value.startswith("http"):
            path = urlparse(value).path.strip("/")
            segments = [s for s in path.split("/") if s]
            if segments:
                return segments[0]
        return value.strip("/").split("?")[0].strip("/")

    @staticmethod
    def normalize_page_url(page_url: str) -> str:
        """Normalisasi input menjadi URL halaman Facebook yang valid.

        Segmen path pertama (username halaman) PERTAHANKAN - hanya query/
        segmen tambahan (posts/..., photos/..., ?locale=...) yang dibuang.
        URL tanpa path (https://www.facebook.com/) dikembalikan apa adanya
        karena itu feed beranda, bukan halaman.
        """
        value = page_url.strip()
        if value.startswith("http"):
            parsed = urlparse(value)
            if "facebook.com" in parsed.netloc:
                segments = [s for s in parsed.path.split("/") if s]
                base = f"{parsed.scheme}://{parsed.netloc}"
                if not segments:
                    return f"{base}/"
                return f"{base}/{segments[0]}/"
            return value
        username = value.lstrip("@").strip("/")
        return f"https://www.facebook.com/{username}/"

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def scrape_all(self, context) -> List[Tuple[Dict[str, str], List[RawPost]]]:
        """Scrape semua halaman dari config, dengan delay antar halaman."""
        results: List[Tuple[Dict[str, str], List[RawPost]]] = []
        pages = self.config.pages[: self.config.max_pages]
        logger.info(f"Target {len(pages)} halaman Facebook publik")

        for idx, page_url in enumerate(pages, 1):
            try:
                meta, posts = await retry_async(
                    lambda: self.scrape_page(context, page_url),
                    retries=self.config.retry_count,
                    base_delay=self.config.retry_base_delay,
                    description=f"scrape halaman {page_url}",
                )
            except FacebookSessionExpired:
                # Sesi mati - bangun ulang dari cookie file, ulangi sekali
                logger.warning(
                    "Sesi Facebook kedaluwarsa saat scraping - "
                    "membangun ulang dari cookies..."
                )
                context = await self.session.rebuild(
                    context.browser  # type: ignore[attr-defined]
                )
                meta, posts = await self.scrape_page(context, page_url)

            results.append((meta, posts))
            if idx < len(pages):
                await self._sleep_request_delay()

        return results

    async def scrape_page(
        self, context, page_url: str
    ) -> Tuple[Dict[str, str], List[RawPost]]:
        """Scrape satu halaman: buka, scroll, parse artikel."""
        username = self.page_username(page_url)
        normalized = self.normalize_page_url(page_url)
        logger.info(f"Opening page... {normalized}")
        logger.info(f"Scraping halaman: {username}")

        page = await context.new_page()
        try:
            await page.goto(
                normalized,
                wait_until="domcontentloaded",
                timeout=self.config.timeout_ms,
            )
            await self._dismiss_dialogs(page)

            if await self._is_login_wall(page):
                raise FacebookSessionExpired(
                    "Facebook meminta login saat membuka halaman "
                    f"{normalized} - cookie sesi mati"
                )

            meta = await self._extract_page_meta(page, username)
            raw_posts = await self._scroll_and_collect(page, username, meta.get("name", username))
            logger.info(f"Extracted {len(raw_posts)} posts.")
            return meta, raw_posts
        finally:
            try:
                await page.close()
            except Exception:
                pass

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    async def _sleep_request_delay(self) -> None:
        import asyncio

        if self.config.request_delay > 0:
            await asyncio.sleep(self.config.request_delay)

    async def _dismiss_dialogs(self, page) -> None:
        """Tutup dialog yang bisa mengganggu scroll (cookie consent, prompt)."""
        for selector in (
            '[aria-label="Allow all cookies"]',
            '[aria-label="Izinkan semua cookie"]',
            '[aria-label="Close"]',
            '[aria-label="Tutup"]',
        ):
            try:
                btn = page.locator(selector).first
                if await btn.count() > 0 and await btn.is_visible():
                    await btn.click(timeout=3000)
            except Exception:
                continue
        for label in ("Not now", "Tidak sekarang"):
            try:
                btn = page.get_by_role("button", name=label).first
                if await btn.count() > 0 and await btn.is_visible():
                    await btn.click(timeout=3000)
            except Exception:
                continue
        try:
            await page.keyboard.press("Escape")
        except Exception:
            pass

    async def _is_login_wall(self, page) -> bool:
        try:
            if "login" in page.url:
                return True
            if await page.locator('input[name="email"]').count() > 0:
                return True
            body = (await page.locator("body").text_content()) or ""
            return "you must log in" in body.lower() or "anda harus masuk" in body.lower()
        except Exception:
            return False

    async def _extract_page_meta(self, page, username: str) -> Dict[str, str]:
        """Nama halaman + avatar dari meta og:title / og:image."""
        meta: Dict[str, str] = {"username": username, "name": username, "avatar_url": ""}
        try:
            title_el = page.locator('meta[property="og:title"]').first
            if await title_el.count() > 0:
                title = (await title_el.get_attribute("content")) or ""
                # "Nama Halaman - Halaman Utama | Facebook"
                name = re.split(r"\s*[-|]\s*(?:Halaman Utama|Home)\s*$", title)[0]
                meta["name"] = name.strip() or username
        except Exception:
            pass
        try:
            img_el = page.locator('meta[property="og:image"]').first
            if await img_el.count() > 0:
                avatar = (await img_el.get_attribute("content")) or ""
                if avatar.startswith("http"):
                    meta["avatar_url"] = avatar
        except Exception:
            pass
        return meta

    async def _scroll_and_collect(
        self, page, username: str, page_name: str
    ) -> List[RawPost]:
        """Scroll bertahap, kumpulkan artikel, dedupe, parse."""
        seen_urls: set = set()
        posts: List[RawPost] = []
        stalls = 0
        max_posts = self.config.max_posts_per_page

        # Tunggu postingan pertama muncul (halaman bisa kosong / anti-bot).
        # Perhatian: div[role="article"] sering berupa skeleton loading yang
        # tidak pernah ter-hydrate - jadi tunggu baris yang sudah berisi teks
        # pesan ([data-ad-preview="message"]) atau link postingan.
        try:
            await page.wait_for_function(
                """() => {
                    const rows = document.querySelectorAll(
                        'div[aria-posinset], div[role="article"]'
                    );
                    for (const r of rows) {
                        if (r.querySelector('[data-ad-preview="message"]')
                            || r.querySelector('a[href*="pfbid"], a[href*="fbid="], a[href*="/posts/"]')) {
                            return true;
                        }
                    }
                    return false;
                }""",
                timeout=min(self.config.timeout_ms, 20000),
            )
        except Exception:
            logger.warning(
                f"Tidak ada postingan ditemukan di halaman {username} "
                "(mungkin halaman kosong/dibatasi)"
            )
            return []

        # Scroll ke bawah bertahap, lalu tunggu konten baru termuat
        # sebelum koleksi artikel berikutnya.
        for scroll_idx in range(self.config.max_scrolls):
            logger.info("Scrolling...")
            try:
                await page.evaluate("window.scrollBy(0, 3000)")
                await page.wait_for_timeout(int(self.config.scroll_delay * 1000))
            except Exception as e:
                logger.warning(f"Scroll gagal: {e}")

            articles = await page.locator(POST_ROW_SELECTOR).all()
            new_count = 0
            for article in articles:
                if len(posts) >= max_posts:
                    break
                raw = await self._parse_article_safely(article, username, page_name)
                if raw is None:
                    continue
                key = raw.url or raw.post_id
                if key in seen_urls:
                    continue
                seen_urls.add(key)
                posts.append(raw)
                new_count += 1

            if new_count == 0:
                stalls += 1
                if stalls >= 2:
                    logger.info("Tidak ada artikel baru setelah 2 scroll - berhenti")
                    break
            else:
                stalls = 0

            if len(posts) >= max_posts:
                logger.info(
                    f"Mencapai batas FACEBOOK_MAX_POSTS ({max_posts}) "
                    f"untuk halaman {username}"
                )
                break

        return posts

    async def _parse_article_safely(self, article, username: str, page_name: str):
        try:
            if await self.parser.is_sponsored(article):
                logger.debug("Artikel bersponsor dilewati")
                return None
            raw = await self.parser.parse_article(article, username, page_name)
            if raw is None:
                logger.debug("Artikel tanpa URL dilewati")
            return raw
        except Exception as e:
            logger.debug(f"Gagal parse artikel: {str(e)[:120]}")
            return None
