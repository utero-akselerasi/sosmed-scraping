"""
Facebook Worker - Festival Mbois Intelligence Platform.

Worker scraping postingan halaman Facebook PUBLIK dengan Playwright,
autentikasi hanya dari file cookie Netscape (TANPA username/password).
Hasil dinormalisasi ke struktur yang sama dengan Instagram worker dan
disimpan lewat shared.database (tabel posts) - backend tidak diubah.

Alur:
    Worker -> Scrape (Playwright) -> Normalize -> Sentiment -> DB -> API/Dashboard

Platform terdaftar di tabel platforms dengan type='facebook' (diseed oleh
schema.sql). Worker memakai get_platform_by_type('facebook') persis seperti
Instagram worker memakai 'instagram'. Jika baris platform tidak ada,
worker gagal dengan pesan jelas (lihat laporan implementasi untuk langkah
manual seeding).
"""

import asyncio
import os
import sys
from datetime import datetime, timezone
from typing import Dict, Optional

from dotenv import load_dotenv
from loguru import logger

# Bootstrap: pastikan direktori workers/ ada di sys.path agar import
# absolut (facebook.* dan shared.*) berhasil - baik dijalankan sebagai
# skrip (`python facebook/worker.py`) maupun sebagai modul/import.
WORKERS_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if WORKERS_DIR not in sys.path:
    sys.path.append(WORKERS_DIR)

load_dotenv()

from shared.browser import PlaywrightManager
from shared.database import DatabaseManager
from shared.sentiment import sentiment_analyzer
from shared.worker_lock import WorkerLock

from facebook.config import FacebookConfig
from facebook.cookies import (
    FacebookCookieError,
    FacebookCookieExpired,
    FacebookCookieManager,
)
from facebook.models import NormalizedPost, RawPost
from facebook.parser import FacebookPostParser, extract_hashtags
from facebook.scraper import FacebookScraper
from facebook.session import FacebookSession

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)


class FacebookWorker:
    """Facebook scraper worker untuk Festival Mbois."""

    def __init__(self):
        self.config = FacebookConfig.from_env()
        self.db = DatabaseManager()
        self.platform_id: Optional[str] = None

        self.cookie_manager = FacebookCookieManager(self.config.cookies_file)
        self.session = FacebookSession(self.config, self.cookie_manager)
        self.browser = PlaywrightManager(
            headless=self.config.headless,
            timeout_ms=self.config.timeout_ms,
            user_agent=USER_AGENT,
            locale="id-ID",
        )
        self.parser = FacebookPostParser()
        self.scraper = FacebookScraper(self.config, self.session, self.parser)

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def initialize(self):
        """Initialize worker: konek DB + cari platform facebook."""
        logger.info("Initializing Facebook worker...")

        await self.db.connect()

        platform = await self.db.get_platform_by_type('facebook')
        if not platform:
            raise Exception(
                "Facebook platform not found in database (type='facebook').\n"
                "Pastikan baris platform ada: SELECT * FROM platforms "
                "WHERE type='facebook';\n"
                "Jika belum ada, jalankan seed backend "
                "(npm run seed) atau INSERT manual (lihat laporan)."
            )
        self.platform_id = platform['id']
        logger.info(f"Platform Facebook ditemukan (id={self.platform_id})")

        if not self.config.pages:
            logger.warning(
                "FACEBOOK_PAGES kosong - set daftar halaman publik di "
                ".env (mis. FACEBOOK_PAGES=https://www.facebook.com/Page1,"
                "https://www.facebook.com/Page2)"
            )

        logger.info("Facebook worker initialized successfully")

    async def close(self):
        """Tutup koneksi browser + database."""
        await self.session.close_context()
        await self.browser.close()
        await self.db.close()
        logger.info("Facebook worker closed")

    # ------------------------------------------------------------------
    # Normalization
    # ------------------------------------------------------------------

    def normalize(self, raw: RawPost) -> NormalizedPost:
        """Normalisasi RawPost ke struktur kontrak pipeline (sama Instagram)."""
        return NormalizedPost(
            platform="facebook",
            platform_post_id=raw.post_id,
            author=raw.author,
            text=raw.text,
            url=raw.url,
            posted_at=self._to_utc_naive(raw.posted_at),
            likes=raw.likes,
            comments=raw.comments,
            shares=raw.shares,
            hashtags=extract_hashtags(raw.text),
            images=raw.images,
            videos=raw.videos,
        )

    @staticmethod
    def _to_utc_naive(dt: Optional[datetime]) -> Optional[datetime]:
        """Konversi timestamp ke UTC naive (sesuai kolom posted_at).

        Label waktu Facebook mengikuti zona waktu akun; karena tidak ada
        info zona di DOM, timestamp dianggap waktu lokal sistem worker.
        """
        if dt is None:
            return None
        if dt.tzinfo is None:
            local_tz = datetime.now().astimezone().tzinfo or timezone.utc
            dt = dt.replace(tzinfo=local_tz)
        return dt.astimezone(timezone.utc).replace(tzinfo=None)

    # ------------------------------------------------------------------
    # Persistence (flow sama dengan Instagram worker)
    # ------------------------------------------------------------------

    async def process_post(
        self,
        post: NormalizedPost,
        raw: RawPost,
        page_meta: Dict[str, str],
    ) -> str:
        """Simpan satu postingan. Returns: 'saved' | 'duplicate' | 'error'."""
        try:
            # Upsert influencer (halaman sebagai influencer)
            influencer_data = {
                'platform_id': self.platform_id,
                'platform_user_id': raw.page_username,
                'username': raw.page_username,
                'full_name': raw.page_name or post.author,
                'profile_picture_url': page_meta.get('avatar_url') or None,
                'followers_count': 0,
                'is_verified': False,
            }
            influencer_id = await self.db.upsert_influencer(influencer_data)

            # Analisis sentimen (modul shared, sama dengan Instagram)
            sentiment, sentiment_score = sentiment_analyzer.analyze(post.text)

            post_insert_data = {
                'platform_id': self.platform_id,
                'influencer_id': influencer_id,
                'platform_post_id': post.platform_post_id,
                'post_type': 'post',
                'content': post.text[:5000],
                'media_urls': post.images + post.videos,
                'post_url': post.url,
                'likes_count': post.likes,
                'comments_count': post.comments,
                'shares_count': post.shares,
                'views_count': 0,
                'sentiment': sentiment,
                'sentiment_score': sentiment_score,
                'hashtags': post.hashtags,
                'mentions': [],
                'location': '',
                'posted_at': post.posted_at or datetime.utcnow(),
                'metadata': {
                    'page_name': raw.page_name,
                    'page_username': raw.page_username,
                    'post_id': post.platform_post_id,
                    'links': raw.links,
                    'extracted_at': datetime.utcnow().isoformat(),
                },
            }

            post_id = await self.db.insert_post(post_insert_data)

            if post_id:
                for hashtag in post.hashtags:
                    await self.db.update_hashtag_usage(hashtag)
                logger.info(
                    f"✓ Saved post {post.platform_post_id} "
                    f"dari {raw.page_name or raw.page_username}"
                )
                return 'saved'

            logger.debug(
                f"Post {post.platform_post_id} sudah ada (duplicate)"
            )
            return 'duplicate'

        except Exception as e:
            logger.error(
                f"Error processing post {post.platform_post_id}: {e}"
            )
            return 'error'

    # ------------------------------------------------------------------
    # Main loop
    # ------------------------------------------------------------------

    async def run(self):
        """Main worker loop."""
        logger.info("=" * 60)
        logger.info("Starting Facebook worker run...")
        logger.info("=" * 60)

        # Cross-process lock: cegah dua instance Facebook worker berjalan
        lock = WorkerLock('facebook')
        if not await lock.acquire(self.db):
            logger.warning(
                "Facebook worker dilewati: instance lain sudah berjalan "
                "(lock aktif). Jalankan setelah proses sebelumnya selesai."
            )
            return

        job_id = None
        posts_collected = 0
        errors = 0

        try:
            # Validasi cookie sebelum launch browser (error jelas lebih awal).
            # Jika storage state valid, cookie file tidak wajib dicek dulu.
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

            results = await self.scraper.scrape_all(context)
            total_posts = sum(len(posts) for _, posts in results)
            logger.info(f"Uploading {total_posts} posts.")

            for page_meta, raw_posts in results:
                for raw in raw_posts:
                    normalized = self.normalize(raw)
                    status = await self.process_post(normalized, raw, page_meta)
                    if status == 'saved':
                        posts_collected += 1
                    else:
                        errors += 1

            # Perbarui storage state (cookie baru dari sesi aktif)
            await self.session.save_state(context)

            await self.db.update_scraping_job(
                job_id, 'completed', posts_collected, errors
            )

            logger.info("=" * 60)
            logger.info(
                f"✓ Facebook worker completed successfully!"
            )
            logger.info(f"  Posts collected: {posts_collected}")
            logger.info(f"  Errors: {errors}")
            logger.info("=" * 60)
            logger.info("Finished successfully.")

        except FacebookCookieExpired as e:
            message = str(e)
            logger.error(message)
            if job_id:
                await self.db.update_scraping_job(
                    job_id, 'failed', posts_collected, errors, message
                )
        except FacebookCookieError as e:
            message = str(e)
            logger.error(message)
            if job_id:
                await self.db.update_scraping_job(
                    job_id, 'failed', posts_collected, errors, message
                )
        except Exception as e:
            logger.error(f"Facebook worker failed: {e}")
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
    logger.add("logs/facebook_worker.log", rotation="1 day", retention="7 days")
    logger.info("=" * 60)
    logger.info("Facebook Worker - Festival Mbois Intelligence Platform")
    logger.info("=" * 60)

    worker = FacebookWorker()
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
    asyncio.run(main())
