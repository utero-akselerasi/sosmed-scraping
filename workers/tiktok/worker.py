"""
TikTok Worker - Apify (clockworks/tiktok-scraper)
Festival Mbois Intelligence Platform

Worker mengambil post TikTok REAL melalui Apify Actor
`clockworks/tiktok-scraper` (pay-per-event, TANPA langganan bulanan),
memetakannya ke skema posts yang sama dengan platform lain, dan
menyimpannya ke PostgreSQL.

Prinsip:
- ZERO dummy/sample data. Jika Apify gagal / Actor gagal / API limit /
  kredit habis / tidak ada hasil -> TIDAK ada post yang di-insert;
  job ditandai failed/skipped dengan error yang dicatat.
- Duplikasi dicegah oleh unique index posts(platform_id,
  platform_post_id, posted_at) + ON CONFLICT DO NOTHING.
- Biaya dibatasi keras: TIKTOK_MAX_POSTS_PER_KEYWORD,
  TIKTOK_MAX_KEYWORDS_PER_RUN, dan maxChargePerRun per run Apify.
- Keyword dibaca DARI DATABASE setiap siklus (tidak di-hardcode).
- Credential TIDAK PERNAH dicetak ke log / error message.

Config (workers/.env):
- APIFY_TOKEN, APIFY_TIKTOK_ACTOR_ID
- TIKTOK_ENABLED, TIKTOK_AUTO_SCRAPE (gate di run_all.py)
- TIKTOK_MAX_POSTS_PER_KEYWORD, TIKTOK_MAX_KEYWORDS_PER_RUN,
  TIKTOK_MAX_CHARGE_PER_RUN, TIKTOK_RUN_TIMEOUT_SECONDS,
  TIKTOK_MAX_RETRIES, TIKTOK_DELAY_SECONDS
"""

import os
import re
import sys
import asyncio
from typing import List, Dict, Any, Optional
from loguru import logger
from dotenv import load_dotenv

load_dotenv()

# Import shared utilities
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from shared.database import DatabaseManager
from shared.sentiment import sentiment_analyzer
from shared.worker_lock import WorkerLock

from tiktok.apify_provider import ApifyTikTokProvider, DEFAULT_ACTOR_ID


class TikTokWorker:
    """TikTok scraper worker - koleksi via Apify, tanpa dummy data."""

    def __init__(self):
        self.db = DatabaseManager()
        self.platform_id: Optional[str] = None
        self.keywords: List[str] = []

        # Credential - hanya di environment, tidak pernah di-log
        self.apify_token = os.getenv('APIFY_TOKEN', '').strip()
        self.actor_id = os.getenv(
            'APIFY_TIKTOK_ACTOR_ID', DEFAULT_ACTOR_ID
        ).strip()

        # Configuration
        self.max_posts_per_keyword = int(
            os.getenv('TIKTOK_MAX_POSTS_PER_KEYWORD', 5)
        )
        self.max_keywords_per_run = int(
            os.getenv('TIKTOK_MAX_KEYWORDS_PER_RUN', 1)
        )
        self.max_charge_per_run = float(
            os.getenv('TIKTOK_MAX_CHARGE_PER_RUN', 0.50)
        )
        self.run_timeout_seconds = int(
            os.getenv('TIKTOK_RUN_TIMEOUT_SECONDS', 600)
        )
        self.max_retries = int(os.getenv('TIKTOK_MAX_RETRIES', 1))
        self.delay_between_keywords = float(
            os.getenv('TIKTOK_DELAY_SECONDS', 3)
        )

        self.seen_post_ids: set = set()
        self.failures: List[str] = []

        self.provider = ApifyTikTokProvider(self)

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def initialize(self):
        """Initialize worker"""
        logger.info("Initializing TikTok worker...")

        await self.db.connect()

        platform = await self.db.get_platform_by_type('tiktok')
        if not platform:
            raise Exception("TikTok platform not found in database")
        self.platform_id = platform['id']

        self.keywords = await self.db.get_active_keywords()
        logger.info(f"Loaded {len(self.keywords)} keywords: {self.keywords}")

        logger.info("TikTok worker initialized successfully")

    async def close(self):
        """Close connections"""
        await self.db.close()
        logger.info("TikTok worker closed")

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
                'post_type': post_data.get('post_type', 'video'),
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
        """Main worker loop - hanya data real, tanpa dummy fallback."""
        logger.info("=" * 60)
        logger.info("Starting TikTok worker run...")
        logger.info("=" * 60)

        lock = WorkerLock('tiktok')
        if not await lock.acquire(self.db):
            logger.warning(
                "TikTok worker dilewati: instance lain sudah berjalan "
                "(lock aktif). Jalankan setelah proses sebelumnya selesai."
            )
            return

        job_id = None
        posts_collected = 0
        errors = 0
        job_metadata: Dict[str, Any] = {}

        try:
            # Cek prasyarat (token) SEBELUM membuat job / biaya apa pun
            prepare_message = await self.provider.prepare()
            if prepare_message:
                logger.error(prepare_message)
                job_id = await self.db.create_scraping_job(self.platform_id)
                await self.db.update_scraping_job(
                    job_id, 'failed', 0, 0, prepare_message
                )
                return

            # Batasi jumlah keyword per run (cost protection)
            keywords = self.keywords[:self.max_keywords_per_run]
            if not keywords:
                logger.warning("Tidak ada keyword aktif - run dibatalkan")
                job_id = await self.db.create_scraping_job(self.platform_id)
                await self.db.update_scraping_job(
                    job_id, 'failed', 0, 0,
                    "Tidak ada keyword aktif di database"
                )
                return

            job_id = await self.db.create_scraping_job(self.platform_id)

            await self.provider.initialize()

            for keyword in keywords:
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

            # Catat biaya Apify (bila tersedia) ke metadata job
            if self.provider.run_costs:
                job_metadata['apify'] = {
                    'actor_id': self.actor_id,
                    'runs': self.provider.run_costs,
                }
                logger.info(
                    f"Apify cost total: "
                    f"{self.provider.run_costs} USD"
                )

            # Jika SEMUA keyword gagal di level koleksi data (bukan sekadar
            # tidak ada hasil), tandai job failed agar terlihat di dashboard.
            if (
                posts_collected == 0
                and len(self.failures) >= len(keywords)
            ):
                fail_message = self.failures[0]
                await self.db.update_scraping_job(
                    job_id, 'failed', 0, errors, fail_message,
                    job_metadata or None
                )
                logger.error(
                    f"TikTok worker selesai dengan kegagalan koleksi: "
                    f"{fail_message}"
                )
                return

            await self.db.update_scraping_job(
                job_id, 'completed', posts_collected, errors,
                metadata=job_metadata or None
            )

            logger.info("=" * 60)
            logger.info("✓ TikTok worker completed successfully!")
            logger.info(f"  Posts collected: {posts_collected}")
            logger.info(f"  Errors: {errors}")
            logger.info("=" * 60)

        except Exception as e:
            logger.error(f"TikTok worker failed: {e}")
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
    logger.add("logs/tiktok_worker.log", rotation="1 day", retention="7 days")
    logger.info("=" * 60)
    logger.info("TikTok Worker - Festival Mbois Intelligence Platform")
    logger.info("=" * 60)

    worker = TikTokWorker()

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
