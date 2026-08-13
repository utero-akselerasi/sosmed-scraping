"""
Threads Worker - Browser Automation (session-based)
Festival Mbois Intelligence Platform

Worker ini TIDAK memakai Meta Graph API / OAuth / access token. Semua
interaksi dengan Threads dilakukan lewat Playwright dengan sesi browser
terautentikasi (persistent storage state / cookie Netscape lokal).

Peraturan keras:
- THREADS_ENABLED default FALSE - tanpa flag ini worker TIDAK membuka
  browser dan tidak membuat scraping_job.
- TANPA THREADS_ACCESS_TOKEN / THREADS_APP_SECRET / password.
- Session disimpan lokal di THREADS_SESSION_DIR (gitignored), reusable,
  tidak pernah di-log, tidak pernah dikirim ke layanan lain.
- Session expired -> job failed dengan pesan re-authentication (bukan
  retry loop).
- Publish post TIDAK pernah dilakukan dari run() ini (anti duplicate).
  Publish hanya lewat CLI eksplisit: threads/publish_text.py,
  threads/publish_image.py.

Alur run():
1. Guard THREADS_ENABLED -> inisialisasi -> lock platform.
2. Buka context browser (storage state, atau bangun dari cookie).
3. Health check sesi (deteksi redirect login):
   - expired -> scraping_job failed (THREADS_SESSION_EXPIRED).
   - valid -> ambil profil akun (getThreadsProfile).
4. Scrape active keywords (pola Instagram worker):
   - search.py: keyword -> URL detail post (batas THREADS_MAX_POSTS).
   - post_parser.py: detail -> data post (timestamp ISO exact).
   - upsert influencer, sentiment (shared/sentiment.py), insert post
     dengan dedup constraint (platform_id, platform_post_id, posted_at),
     update hashtag usage.
   - Error per post / per keyword dicatat - TIDAK menghentikan job.
5. Simpan storage state terbaru -> scraping_job completed (dengan
   counter posts_collected / errors_count sesuai hasil).
"""

import asyncio
import os
import re
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from loguru import logger

# Bootstrap: pastikan direktori workers/ ada di sys.path agar import
# absolut (threads.* dan shared.*) berhasil.
WORKERS_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if WORKERS_DIR not in sys.path:
    sys.path.append(WORKERS_DIR)

load_dotenv()

from shared.browser import PlaywrightManager
from shared.database import DatabaseManager
from shared.relevance import match_keywords
from shared.sentiment import sentiment_analyzer
from shared.worker_lock import WorkerLock

from threads.config import ThreadsConfig
from threads.cookies import ThreadsCookieManager
from threads.errors import (
    ThreadsCookieError,
    ThreadsError,
)
from threads.post_parser import parse_post_data
from threads.profile import get_threads_profile
from threads.search import collect_post_links
from threads.session import (
    SESSION_EXPIRED,
    SESSION_VALID,
    ThreadsSessionManager,
)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)


def parse_posted_at(value: Any) -> Optional[datetime]:
    """Konversi posted_at ISO UTC ('2026-08-08T20:14:52.000Z') menjadi
    naive datetime UTC - format sama dengan post.date_utc Instagram
    (kolom posted_at TIMESTAMP tanpa timezone).

    Returns None jika kosong / tidak bisa dikonversi.
    """
    if not value:
        return None
    try:
        normalized = str(value).strip().replace("Z", "+00:00")
        dt = datetime.fromisoformat(normalized)
        if dt.tzinfo is not None:
            dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt
    except ValueError:
        return None


def map_post_type(post_type: Optional[str]) -> str:
    """Map post_type Threads ('text'|'image'|'video') ke enum post_type
    database ('post'|'reel'|'story'|'video'|'article').

    'video' -> 'video'; 'text'/'image' (tidak ada di enum) -> 'post'.
    """
    if post_type == "video":
        return "video"
    return "post"


def map_parsed_post(parsed: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Map hasil post_parser.py ke struktur data database (tanpa DB call).

    Kontrak Phase 9:
    - platform_user_id = username (Threads tidak punya user id numerik
      yang reliable di DOM - keputusan Phase 8).
    - Field yang tidak tersedia -> NULL / 0 sesuai kontrak database.
    - posted_at WAJIB ada (kolom NOT NULL) - None jika tidak bisa
      dikonversi (post dilewati, bukan crash).
    - reposts_count tetap di metadata (tidak ada kolom DB khusus).
    """
    posted_at = parse_posted_at(parsed.get("posted_at"))
    if posted_at is None:
        logger.warning(
            f"[Threads] posted_at tidak valid untuk "
            f"{parsed.get('platform_post_id')} - post dilewati"
        )
        return None

    username = parsed.get("username")
    if not username:
        logger.warning(
            f"[Threads] username kosong untuk "
            f"{parsed.get('platform_post_id')} - post dilewati"
        )
        return None

    return {
        'platform_user_id': username,
        'username': username,
        'full_name': parsed.get('full_name'),
        'profile_picture_url': parsed.get('profile_picture_url'),
        'followers_count': 0,
        'is_verified': False,
        'platform_post_id': parsed.get('platform_post_id'),
        'post_type': map_post_type(parsed.get('post_type')),
        'content': parsed.get('content') or '',
        'media_urls': parsed.get('media_urls') or [],
        'post_url': parsed.get('post_url'),
        'likes_count': parsed.get('likes_count') or 0,
        'comments_count': parsed.get('comments_count') or 0,
        'shares_count': parsed.get('shares_count') or 0,
        'views_count': parsed.get('views_count') or 0,
        'posted_at': posted_at,
        'metadata': parsed.get('metadata'),
    }


class ThreadsWorker:
    """Threads worker - browser automation, sesi lokal reusable."""

    def __init__(self):
        self.config = ThreadsConfig.from_env()
        self.db = DatabaseManager()
        self.platform_id: Optional[str] = None
        self.keywords: List[str] = []

        # Metrics run (Phase 12): candidates -> parsed -> relevant/filtered
        # -> inserted/duplicates/errors. filtered BUKAN error.
        self.metrics = {
            "candidates": 0,
            "parsed": 0,
            "relevant": 0,
            "filtered": 0,
            "inserted": 0,
            "duplicates": 0,
            "errors": 0,
        }

        self.cookie_manager = ThreadsCookieManager(self.config.cookies_file)
        self.session = ThreadsSessionManager(self.config, self.cookie_manager)
        self.browser = PlaywrightManager(
            headless=self.config.headless,
            timeout_ms=self.config.timeout_ms,
            slow_mo=self.config.slow_mo_ms,
            user_agent=USER_AGENT,
            locale="id-ID",
        )

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def initialize(self):
        """Initialize worker: konek DB + cari platform threads."""
        logger.info("Initializing Threads worker...")

        await self.db.connect()

        platform = await self.db.get_platform_by_type('threads')
        if not platform:
            raise Exception(
                "Threads platform not found in database (type='threads').\n"
                "Pastikan baris platform ada: SELECT * FROM platforms "
                "WHERE type='threads'; (diseed oleh schema.sql)"
            )
        self.platform_id = platform['id']
        logger.info(f"Platform Threads ditemukan (id={self.platform_id})")

        # Ambil active keywords (pola Instagram worker)
        self.keywords = await self.db.get_active_keywords()
        logger.info(
            f"Loaded {len(self.keywords)} keywords: {self.keywords}"
        )

        # Log konfigurasi TANPA kredensial apa pun
        logger.info(
            f"[Threads] config: enabled={self.config.enabled}, "
            f"headless={self.config.headless}, "
            f"session_dir={self.config.session_dir}, "
            f"timeout_ms={self.config.timeout_ms}, "
            f"slow_mo_ms={self.config.slow_mo_ms}, "
            f"retry_count={self.config.retry_count}"
        )
        logger.info("Threads worker initialized successfully")

    async def close(self):
        """Tutup koneksi browser + database."""
        await self.session.close_context()
        await self.browser.close()
        await self.db.close()
        logger.info("Threads worker closed")

    # ------------------------------------------------------------------
    # Scraping & database (pola Instagram worker)
    # ------------------------------------------------------------------

    def extract_hashtags(self, text: str) -> List[str]:
        """Extract hashtags dari content (pola Instagram worker)."""
        if not text:
            return []
        hashtags = re.findall(r'#(\w+)', text)
        return [f"#{tag.lower()}" for tag in hashtags]

    def extract_mentions(self, text: str) -> List[str]:
        """Extract mentions dari content (pola Instagram worker)."""
        if not text:
            return []
        mentions = re.findall(r'@(\w+)', text)
        return [f"@{mention}" for mention in mentions]

    async def process_post(self, parsed: Dict[str, Any]) -> str:
        """Map hasil parser lalu simpan satu post Threads ke database.

        Pola Instagram worker.process_post:
        - STRICT RELEVANCE CHECK (Phase 12): content post dicocokkan
          dengan active keyword (source of truth dari Keyword
          Management). IRRELEVANT -> post DILEWATI tanpa upsert
          influencer dan tanpa insert post.
        - upsert influencer (platform_user_id = username, Phase 8)
        - sentiment analysis (shared/sentiment.py - provider SAMA)
        - extract hashtags + mentions dari content
        - insert post (dedup via constraint DB existing)
        - update hashtag usage per hashtag

        Returns status string:
            "inserted"  - post baru tersimpan
            "duplicate" - post sudah ada (constraint DO NOTHING)
            "filtered"  - tidak relevan dengan keyword aktif (bukan error)
            "skipped"   - post tidak bisa dipetakan ke database
            "error"     - exception saat proses
        """
        try:
            mapped = map_parsed_post(parsed)
            if mapped is None:
                logger.warning(
                    f"[Threads] Post {parsed.get('platform_post_id')} "
                    "tidak bisa dipetakan ke database - dilewati"
                )
                return "skipped"

            content = mapped['content']

            # Phase 12: relevance check TERHADAP active keyword dari DB.
            matched = match_keywords(self.keywords, content)
            if not matched:
                logger.info(
                    f"[Threads] FILTERED post "
                    f"{mapped['platform_post_id']} (@{mapped['username']}): "
                    f"konten tidak relevan dengan keyword aktif "
                    f"{self.keywords} - tidak disimpan"
                )
                return "filtered"

            # Metadata keyword_source: LIST keyword aktif yang match
            # (bisa lebih dari satu keyword; schema tidak berubah).
            metadata = dict(mapped.get('metadata') or {})
            metadata['keyword_source'] = matched
            mapped['metadata'] = metadata

            influencer_data = {
                'platform_id': self.platform_id,
                'platform_user_id': mapped['platform_user_id'],
                'username': mapped['username'],
                'full_name': mapped['full_name'],
                'profile_picture_url': mapped['profile_picture_url'],
                'followers_count': mapped['followers_count'],
                'is_verified': mapped['is_verified'],
            }

            influencer_id = await self.db.upsert_influencer(influencer_data)

            sentiment, sentiment_score = sentiment_analyzer.analyze(content)
            hashtags = self.extract_hashtags(content)
            mentions = self.extract_mentions(content)

            post_insert_data = {
                'platform_id': self.platform_id,
                'influencer_id': influencer_id,
                'platform_post_id': mapped['platform_post_id'],
                'post_type': mapped['post_type'],
                'content': content,
                'media_urls': mapped['media_urls'],
                'post_url': mapped['post_url'],
                'likes_count': mapped['likes_count'],
                'comments_count': mapped['comments_count'],
                'shares_count': mapped['shares_count'],
                'views_count': mapped['views_count'],
                'sentiment': sentiment,
                'sentiment_score': sentiment_score,
                'hashtags': hashtags,
                'mentions': mentions,
                'location': None,
                'posted_at': mapped['posted_at'],
                'metadata': mapped['metadata'],
            }

            post_id = await self.db.insert_post(post_insert_data)

            if post_id:
                for hashtag in hashtags:
                    await self.db.update_hashtag_usage(hashtag)
                logger.info(
                    f"✓ Saved post {mapped['platform_post_id']} "
                    f"from @{mapped['username']} (keyword: {matched})"
                )
                return "inserted"

            logger.debug(
                f"Post {mapped['platform_post_id']} already exists (skipped)"
            )
            return "duplicate"

        except Exception as e:
            logger.error(f"Error processing post: {e}")
            return "error"

    async def _scrape_keywords(self, page: Any) -> tuple:
        """Scrape semua active keyword: search -> detail -> simpan DB.

        Error per post / per keyword TIDAK menghentikan job (pola
        Instagram). THREADS_MAX_POSTS dihormati oleh collect_post_links.

        Metrics (Phase 12) diisi di self.metrics:
        candidates (URL ditemukan) -> parsed -> relevant/filtered ->
        inserted/duplicates/errors.

        Returns:
            (posts_collected, errors) - kompatibel dengan update_scraping_job
            (posts_collected = jumlah post BARU tersimpan; errors = error
            nyata, FILTERED tidak dihitung sebagai error).
        """
        posts_collected = 0
        errors = 0

        for keyword in self.keywords:
            logger.info(f"\n📍 Processing keyword: {keyword}")
            try:
                urls = await collect_post_links(
                    page,
                    keyword,
                    self.config.max_posts_per_keyword,
                    self.config.timeout_ms,
                )
                if not urls:
                    logger.warning(
                        f"[Threads] Keyword '{keyword}' tidak menghasilkan "
                        "post - dilewati (tanpa dummy)"
                    )
                    continue

                logger.info(
                    f"[Threads] Keyword '{keyword}': {len(urls)} URL detail "
                    f"post (max={self.config.max_posts_per_keyword})"
                )

                for url in urls:
                    self.metrics["candidates"] += 1
                    try:
                        parsed = await parse_post_data(
                            page, url, keyword, self.config.timeout_ms
                        )
                    except Exception as e:
                        self.metrics["errors"] += 1
                        errors += 1
                        logger.error(
                            f"[Threads] Gagal parse {url} "
                            f"(keyword '{keyword}'): {e}"
                        )
                        continue
                    if parsed is None:
                        continue

                    self.metrics["parsed"] += 1
                    status = await self.process_post(parsed)

                    if status == "inserted":
                        posts_collected += 1
                        self.metrics["inserted"] += 1
                        self.metrics["relevant"] += 1
                    elif status == "filtered":
                        self.metrics["filtered"] += 1
                    elif status == "duplicate":
                        self.metrics["duplicates"] += 1
                        self.metrics["relevant"] += 1
                    elif status == "error":
                        errors += 1
                        self.metrics["errors"] += 1
                    # status == "skipped": tidak relevan untuk metrics
                    # (post gagal dipetakan - log sudah ditulis process_post)

            except Exception as e:
                self.metrics["errors"] += 1
                errors += 1
                logger.error(
                    f"[Threads] Keyword '{keyword}' gagal diproses: {e} - "
                    "lanjut keyword berikutnya"
                )
                continue

            # Rate limiting antar keyword (pola Instagram worker)
            await self._delay_between_keywords()

        return posts_collected, errors

    async def _delay_between_keywords(self) -> None:
        """Jeda antar keyword (rate limiting, pola Instagram worker)."""
        await asyncio.sleep(3)

    # ------------------------------------------------------------------
    # Main loop
    # ------------------------------------------------------------------

    async def run(self):
        """Main worker loop: sesi valid -> scrape keywords -> simpan DB.

        TANPA publish - publish hanya via threads/publish_text.py /
        threads/publish_image.py (anti duplicate).
        """
        logger.info("=" * 60)
        logger.info("Starting Threads worker run...")
        logger.info("=" * 60)

        # Guard utama: tanpa THREADS_ENABLED=true tidak ada browser/job
        if not self.config.enabled:
            logger.warning(
                "THREADS_ENABLED=false - Threads worker SKIP (tidak "
                "membuka browser, tidak membuat scraping_job)."
            )
            return

        # Cross-process lock: cegah dua instance berjalan bersamaan
        lock = WorkerLock('threads')
        if not await lock.acquire(self.db):
            logger.warning(
                "Threads worker dilewati: instance lain sudah berjalan "
                "(lock aktif)."
            )
            return

        job_id = None
        posts_collected = 0
        errors = 0

        try:
            # Validasi cookie sebelum launch browser (error jelas lebih awal)
            if not self.config.storage_state_file.exists():
                from shared.cookies import parse_netscape_cookies

                self.cookie_manager.load_playwright_cookies()
                self.cookie_manager.validate_parsed(
                    parse_netscape_cookies(self.config.cookies_file)
                )

            logger.info("Launching Playwright...")
            await self.browser.start()
            context = await self.session.get_context(self.browser)

            job_id = await self.db.create_scraping_job(self.platform_id)

            result = await self.session.check_session(context)

            if result["status"] == SESSION_EXPIRED:
                message = (
                    "Threads session expired - re-authentication "
                    "dibutuhkan. Jalankan threads/login.py (login manual) "
                    "atau threads/import_cookies.py (cookie baru), lalu "
                    "jalankan worker lagi."
                )
                logger.error(message)
                await self.db.update_scraping_job(
                    job_id, 'failed', 0, 0, message
                )
                return

            profile: Dict[str, Optional[str]] = await get_threads_profile(
                context, self.config
            )
            logger.info(
                f"[Threads] session valid, profil: "
                f"@{profile.get('username') or '(unknown)'} "
                f"({profile.get('displayName') or '-'})"
            )

            # Scrape active keywords (search -> detail -> insert DB)
            if not self.keywords:
                logger.warning(
                    "[Threads] Tidak ada active keyword di database - "
                    "tidak ada yang di-scrape"
                )
            else:
                page = await context.new_page()
                try:
                    posts_collected, errors = await self._scrape_keywords(page)
                finally:
                    await page.close()

            # Perbarui storage state (cookie terbaru dari sesi aktif)
            await self.session.save_state(context)

            await self.db.update_scraping_job(
                job_id, 'completed', posts_collected, errors, None
            )

            logger.info("=" * 60)
            logger.info("✓ Threads worker completed successfully!")
            logger.info(
                f"  Session: valid (@{profile.get('username') or 'unknown'})"
            )
            logger.info(f"  Posts collected: {posts_collected}")
            logger.info(f"  Errors: {errors}")
            logger.info("  Metrics (Phase 12):")
            logger.info(
                f"    candidates    : {self.metrics['candidates']}"
            )
            logger.info(
                f"    parsed        : {self.metrics['parsed']}"
            )
            logger.info(
                f"    relevant      : {self.metrics['relevant']}"
            )
            logger.info(
                f"    filtered      : {self.metrics['filtered']}"
            )
            logger.info(
                f"    inserted      : {self.metrics['inserted']}"
            )
            logger.info(
                f"    duplicates    : {self.metrics['duplicates']}"
            )
            logger.info(
                f"    errors        : {self.metrics['errors']}"
            )
            logger.info(
                "  Catatan: run ini hanya scraping + health check - "
                "publish post dilakukan via threads/publish_text.py / "
                "threads/publish_image.py"
            )
            logger.info("=" * 60)

        except ThreadsCookieError as e:
            message = str(e)
            logger.error(message)
            if job_id:
                await self.db.update_scraping_job(
                    job_id, 'failed', posts_collected, errors, message
                )
        except ThreadsError as e:
            message = str(e)
            logger.error(message)
            if job_id:
                await self.db.update_scraping_job(
                    job_id, 'failed', posts_collected, errors, message
                )
        except Exception as e:
            logger.error(f"Threads worker failed: {e}")
            import traceback

            logger.error(traceback.format_exc())
            if job_id:
                await self.db.update_scraping_job(
                    job_id, 'failed', posts_collected, errors, str(e)
                )
        finally:
            await self.session.save_state()
            await lock.release()


async def main():
    """Main entry point."""
    import asyncio

    os.makedirs("logs", exist_ok=True)
    logger.add("logs/threads_worker.log", rotation="1 day", retention="7 days")
    logger.info("=" * 60)
    logger.info("Threads Worker - Festival Mbois Intelligence Platform")
    logger.info("=" * 60)

    worker = ThreadsWorker()
    try:
        await worker.initialize()
        await worker.run()
    except Exception as e:
        logger.error(f"Worker error: {e}")
        import traceback

        logger.error(traceback.format_exc())
    finally:
        await worker.close()


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
