"""
TikTok Worker - SKIP MODE (belum diimplementasikan)
Festival Mbois Intelligence Platform

Status: TikTok BELUM diimplementasikan.

Perilaku saat ini:
- Tidak melakukan scraping apa pun.
- Tidak ada fallback sample data / dummy data.
- Tidak ada insert post sama sekali.
- Setiap run hanya membuat scraping_job, mencatat status 'completed'
  dengan 0 post, dan menulis log yang jelas bahwa TikTok belum
  diimplementasikan.

Dummy/sample data telah DIHAPUS total - tidak ada lagi data palsu
yang masuk ke database dari worker ini.
"""

import os
import asyncio
from typing import List, Optional
from loguru import logger
from dotenv import load_dotenv

load_dotenv()

# Import shared utilities
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from shared.database import DatabaseManager


class TikTokWorker:
    """TikTok scraper worker - SKIP karena belum diimplementasikan"""

    def __init__(self):
        self.db = DatabaseManager()
        self.platform_id: Optional[str] = None
        self.keywords: List[str] = []

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

    async def run(self):
        """Main worker loop - SKIP MODE: TikTok belum diimplementasikan."""
        logger.info("=" * 60)
        logger.info("Starting TikTok worker run...")
        logger.info("=" * 60)

        job_id = await self.db.create_scraping_job(self.platform_id)

        try:
            logger.warning(
                "TIKTOK BELUM DIIMPLEMENTASIKAN - worker SKIP tanpa scraping "
                "dan tanpa data dummy."
            )
            logger.warning(
                "Tidak ada video yang di-scrape, tidak ada post yang di-insert."
            )

            for keyword in self.keywords:
                logger.info(
                    f"⏭  SKIP keyword '{keyword}' - TikTok belum diimplementasikan "
                    f"(tanpa dummy data)"
                )

            # Status job: completed dengan 0 post (skip bersih)
            await self.db.update_scraping_job(
                job_id, 'completed', 0, 0
            )

            logger.info("=" * 60)
            logger.info(
                f"✓ TikTok worker selesai (SKIP - belum diimplementasikan). "
                f"Posts collected: 0"
            )
            logger.info("=" * 60)

        except Exception as e:
            logger.error(f"TikTok worker failed: {e}")
            await self.db.update_scraping_job(
                job_id, 'failed', 0, 0, str(e)
            )


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
    finally:
        await worker.close()


if __name__ == "__main__":
    asyncio.run(main())
