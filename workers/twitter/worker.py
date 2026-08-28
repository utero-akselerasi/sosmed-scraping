"""
X (Twitter) Worker - provider dispatcher (API v2 / Playwright)
Festival Mbois Intelligence Platform

Worker mengambil post dari X (Twitter) melalui salah satu provider yang
dipilih lewat environment TWITTER_PROVIDER:
- api        : Official X API v2 (Recent Search, Bearer Token app-only)
- playwright : browser Playwright + sesi cookie Netscape (development)

Logika bersama (database, normalisasi struktur post, sentiment, dedup,
job, analytics) tetap di worker ini; hanya lapisan koleksi data yang
berbeda per provider (lihat api_provider.py / playwright_provider.py).

Credential TIDAK PERNAH dicetak ke log / error message.
"""

import os
import re
import sys
import asyncio
from pathlib import Path
from typing import List, Dict, Any, Optional
from loguru import logger
from dotenv import load_dotenv

load_dotenv()

# Import shared utilities
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from shared.database import DatabaseManager
from shared.sentiment import sentiment_analyzer
from shared.worker_lock import WorkerLock

from twitter.api_provider import XAPIProvider
from twitter.playwright_provider import XPlaywrightProvider


def resolve_path(value: str) -> Path:
    """Resolve path relatif dari direktori workers (CWD normal saat run)."""
    return Path(value).expanduser()


class TwitterWorker:
    """X (Twitter) scraper worker - memilih provider via TWITTER_PROVIDER."""

    def __init__(self):
        self.db = DatabaseManager()
        self.platform_id: Optional[str] = None
        self.keywords: List[str] = []

        # Credential - hanya di environment, tidak pernah di-log
        self.bearer_token = os.getenv('TWITTER_BEARER_TOKEN', '').strip()

        # Provider selection
        self.provider_type = os.getenv('TWITTER_PROVIDER', 'api').strip().lower()
        if self.provider_type not in ('api', 'playwright'):
            logger.warning(
                f"TWITTER_PROVIDER '{self.provider_type}' tidak dikenal - "
                "fallback ke 'api'"
            )
            self.provider_type = 'api'

        # Configuration (dipakai bersama provider)
        self.max_posts_per_keyword = int(
            os.getenv('TWITTER_MAX_POSTS_PER_KEYWORD', 50)
        )
        self.exclude_retweets = os.getenv(
            'TWITTER_EXCLUDE_RETWEETS', 'true'
        ).lower() == 'true'
        self.lang_filter = os.getenv('TWITTER_LANG', '').strip()
        self.timeout_seconds = int(os.getenv('TWITTER_TIMEOUT_SECONDS', 30))
        self.max_retries = int(os.getenv('TWITTER_MAX_RETRIES', 3))
        self.delay_between_keywords = float(
            os.getenv('TWITTER_DELAY_SECONDS', 3)
        )

        # Configuration Playwright provider
        self.headless = os.getenv('TWITTER_HEADLESS', 'true').lower() == 'true'
        self.max_scrolls = int(os.getenv('TWITTER_MAX_SCROLLS', 10))
        self.cookies_file = resolve_path(os.getenv(
            'TWITTER_COOKIES_FILE', './twitter/twitter_cookies.txt'
        ))
        self.storage_state_file = resolve_path(os.getenv(
            'TWITTER_STORAGE_STATE_FILE', './twitter/twitter_state.json'
        ))

        self.seen_post_ids: set = set()
        self.failures: List[str] = []

        # Provider instance
        if self.provider_type == 'api':
            self.provider: Any = XAPIProvider(self)
        else:
            self.provider = XPlaywrightProvider(self)

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def initialize(self):
        """Initialize worker"""
        logger.info("Initializing X (Twitter) worker...")
        logger.info(f"Provider aktif: {self.provider_type}")

        await self.db.connect()

        platform = await self.db.get_platform_by_type('twitter')
        if not platform:
            raise Exception("Twitter/X platform not found in database")
        self.platform_id = platform['id']

        self.keywords = await self.db.get_active_keywords()
        logger.info(f"Loaded {len(self.keywords)} keywords: {self.keywords}")

        logger.info("X (Twitter) worker initialized successfully")

    async def close(self):
        """Close connections"""
        await self.db.close()
        logger.info("X (Twitter) worker closed")

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def extract_hashtags(self, text: str) -> List[str]:
        """Extract hashtags from text"""
        if not text:
            return []
        hashtags = re.findall(r'#(\w+)', text)
        return [f"#{tag.lower()}" for tag in hashtags]

    def extract_mentions(self, text: str) -> List[str]:
        """Extract mentions from text"""
        if not text:
            return []
        mentions = re.findall(r'@(\w+)', text)
        return [f"@{mention}" for mention in mentions]

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    async def process_post(self, post_data: Dict[str, Any]) -> bool:
        """Process and save a single post (influencer + post + sentiment)."""
        try:
            influencer_data = {
                'platform_id': self.platform_id,
                'platform_user_id': post_data['platform_user_id'],
                'username': post_data['username'],
                'full_name': post_data.get('full_name'),
                'profile_picture_url': post_data.get('profile_picture_url'),
                'followers_count': post_data.get('followers_count', 0),
                'is_verified': post_data.get('is_verified', False),
            }

            influencer_id = await self.db.upsert_influencer(influencer_data)

            content = post_data.get('content', '')

            sentiment, sentiment_score = sentiment_analyzer.analyze(content)

            hashtags = self.extract_hashtags(content)
            mentions = self.extract_mentions(content)

            post_insert_data = {
                'platform_id': self.platform_id,
                'influencer_id': influencer_id,
                'platform_post_id': post_data['platform_post_id'],
                'post_type': post_data.get('post_type', 'post'),
                'content': content,
                'media_urls': post_data.get('media_urls', []),
                'post_url': post_data.get('post_url'),
                'likes_count': post_data.get('likes_count', 0),
                'comments_count': post_data.get('comments_count', 0),
                'shares_count': post_data.get('shares_count', 0),
                'views_count': post_data.get('views_count', 0),
                'sentiment': sentiment,
                'sentiment_score': sentiment_score,
                'hashtags': hashtags,
                'mentions': mentions,
                'location': post_data.get('location'),
                'posted_at': post_data['posted_at'],
                'metadata': post_data.get('metadata'),
            }

            post_id = await self.db.insert_post(post_insert_data)

            if post_id:
                for hashtag in hashtags:
                    await self.db.update_hashtag_usage(hashtag)
                logger.info(
                    f"✓ Saved post {post_data['platform_post_id']} "
                    f"from @{post_data['username']}"
                )
                return True
            else:
                logger.debug(
                    f"Post {post_data['platform_post_id']} already exists "
                    f"(skipped)"
                )

            return False

        except Exception as e:
            logger.exception(f"Error processing post: {e}")
            return False

    # ------------------------------------------------------------------
    # Run
    # ------------------------------------------------------------------

    async def run(self):
        """Main worker loop"""
        logger.info("=" * 60)
        logger.info("Starting X (Twitter) worker run...")
        logger.info(f"Provider: {self.provider_type}")
        logger.info("=" * 60)

        lock = WorkerLock('twitter')
        if not await lock.acquire(self.db):
            logger.warning(
                "X worker dilewati: instance lain sudah berjalan "
                "(lock aktif). Jalankan setelah proses sebelumnya selesai."
            )
            return

        job_id = None
        posts_collected = 0
        errors = 0

        try:
            # Cek prasyarat provider (token/cookie) SEBELUM membuat job
            prepare_message = await self.provider.prepare()
            if prepare_message:
                logger.error(prepare_message)
                job_id = await self.db.create_scraping_job(self.platform_id)
                await self.db.update_scraping_job(
                    job_id, 'failed', 0, 0, prepare_message
                )
                return

            job_id = await self.db.create_scraping_job(self.platform_id)

            await self.provider.initialize()

            for keyword in self.keywords:
                logger.info(f"\n📍 Processing keyword: {keyword}")

                posts = await self.provider.search_keyword(keyword)

                logger.info(f"Found {len(posts)} posts for {keyword}")

                for post in posts:
                    success = await self.process_post(post)
                    if success:
                        posts_collected += 1
                    else:
                        errors += 1

                await asyncio.sleep(self.delay_between_keywords)

            # Jika SEMUA keyword gagal di level koleksi data (bukan sekadar
            # tidak ada hasil), tandai job sebagai failed agar terlihat di
            # dashboard.
            if (
                posts_collected == 0
                and self.keywords
                and len(self.failures) >= len(self.keywords)
            ):
                fail_message = self.failures[0]
                await self.db.update_scraping_job(
                    job_id, 'failed', 0, errors, fail_message
                )
                logger.error(
                    f"X (Twitter) worker selesai dengan kegagalan koleksi: "
                    f"{fail_message}"
                )
                return

            await self.db.update_scraping_job(
                job_id, 'completed', posts_collected, errors
            )

            logger.info("=" * 60)
            logger.info("✓ X (Twitter) worker completed successfully!")
            logger.info(f"  Posts collected: {posts_collected}")
            logger.info(f"  Errors: {errors}")
            logger.info("=" * 60)

        except Exception as e:
            logger.error(f"X (Twitter) worker failed: {e}")
            if job_id:
                await self.db.update_scraping_job(
                    job_id, 'failed', posts_collected, errors, str(e)
                )
        finally:
            try:
                await self.provider.close()
            except Exception:
                pass
            await lock.release()


async def main():
    """Main entry point"""
    logger.add("logs/twitter_worker.log", rotation="1 day", retention="7 days")
    logger.info("=" * 60)
    logger.info("X (Twitter) Worker - Festival Mbois Intelligence Platform")
    logger.info("=" * 60)

    worker = TwitterWorker()

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
