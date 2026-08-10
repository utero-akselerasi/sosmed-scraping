"""
Worker Orchestrator - Run All Workers
Festival Mbois Intelligence Platform

This script runs all workers in sequence or parallel
"""

import asyncio
import sys
import os
from datetime import datetime
from loguru import logger

# Add parent directory to path
sys.path.append(os.path.dirname(__file__))

# Import workers
from instagram.worker import InstagramWorker
from tiktok.worker import TikTokWorker
from website.scraper import WebsiteScraper
from facebook.worker import FacebookWorker
from twitter.worker import TwitterWorker


class WorkerOrchestrator:
    """Orchestrates all workers"""
    
    def __init__(self):
        self.instagram_worker = InstagramWorker()
        self.tiktok_worker = TikTokWorker()
        self.website_scraper = WebsiteScraper()
        self.facebook_worker = FacebookWorker()
        self.twitter_worker = TwitterWorker()
    
    async def run_all_sequential(self):
        """Run all workers sequentially"""
        logger.info("=" * 70)
        logger.info("WORKER ORCHESTRATOR - Sequential Mode")
        logger.info(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info("=" * 70)
        
        results = {
            'instagram': {'status': 'pending', 'error': None},
            'tiktok': {'status': 'pending', 'error': None},
            'website': {'status': 'pending', 'error': None},
            'facebook': {'status': 'pending', 'error': None},
            'twitter': {'status': 'pending', 'error': None},
        }
        
        # Run Instagram worker
        try:
            logger.info("\n🔵 Starting Instagram Worker...")
            await self.instagram_worker.initialize()
            await self.instagram_worker.run()
            await self.instagram_worker.close()
            results['instagram']['status'] = 'completed'
            logger.info("✓ Instagram Worker completed")
        except Exception as e:
            logger.error(f"✗ Instagram Worker failed: {e}")
            results['instagram']['status'] = 'failed'
            results['instagram']['error'] = str(e)
        
        # Run TikTok worker
        try:
            logger.info("\n🔵 Starting TikTok Worker...")
            await self.tiktok_worker.initialize()
            await self.tiktok_worker.run()
            await self.tiktok_worker.close()
            results['tiktok']['status'] = 'completed'
            logger.info("✓ TikTok Worker completed")
        except Exception as e:
            logger.error(f"✗ TikTok Worker failed: {e}")
            results['tiktok']['status'] = 'failed'
            results['tiktok']['error'] = str(e)
        
        # Run Website scraper
        try:
            logger.info("\n🔵 Starting Website Scraper...")
            await self.website_scraper.initialize()
            await self.website_scraper.run()
            await self.website_scraper.close()
            results['website']['status'] = 'completed'
            logger.info("✓ Website Scraper completed")
        except Exception as e:
            logger.error(f"✗ Website Scraper failed: {e}")
            results['website']['status'] = 'failed'
            results['website']['error'] = str(e)
        
        # Run Facebook worker
        try:
            logger.info("\n🔵 Starting Facebook Worker...")
            await self.facebook_worker.initialize()
            await self.facebook_worker.run()
            await self.facebook_worker.close()
            results['facebook']['status'] = 'completed'
            logger.info("✓ Facebook Worker completed")
        except Exception as e:
            logger.error(f"✗ Facebook Worker failed: {e}")
            results['facebook']['status'] = 'failed'
            results['facebook']['error'] = str(e)
        
        # Run X (Twitter) worker
        try:
            logger.info("\n🔵 Starting X (Twitter) Worker...")
            await self.twitter_worker.initialize()
            await self.twitter_worker.run()
            await self.twitter_worker.close()
            results['twitter']['status'] = 'completed'
            logger.info("✓ X (Twitter) Worker completed")
        except Exception as e:
            logger.error(f"✗ X (Twitter) Worker failed: {e}")
            results['twitter']['status'] = 'failed'
            results['twitter']['error'] = str(e)
        
        # Summary
        logger.info("\n" + "=" * 70)
        logger.info("WORKER ORCHESTRATOR - Summary")
        logger.info("=" * 70)
        
        completed = sum(1 for r in results.values() if r['status'] == 'completed')
        failed = sum(1 for r in results.values() if r['status'] == 'failed')
        
        for worker_name, result in results.items():
            status_emoji = "✓" if result['status'] == 'completed' else "✗"
            logger.info(f"{status_emoji} {worker_name.capitalize()}: {result['status']}")
            if result['error']:
                logger.error(f"  Error: {result['error']}")
        
        logger.info(f"\nTotal: {completed} completed, {failed} failed")
        logger.info(f"Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info("=" * 70)
        
        return results
    
    async def run_all_parallel(self):
        """Run all workers in parallel"""
        logger.info("=" * 70)
        logger.info("WORKER ORCHESTRATOR - Parallel Mode")
        logger.info(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info("=" * 70)
        
        async def run_worker(worker, name):
            try:
                logger.info(f"\n🔵 Starting {name} Worker...")
                await worker.initialize()
                await worker.run()
                await worker.close()
                logger.info(f"✓ {name} Worker completed")
                return {'status': 'completed', 'error': None}
            except Exception as e:
                logger.error(f"✗ {name} Worker failed: {e}")
                return {'status': 'failed', 'error': str(e)}
        
        # Run all workers in parallel
        instagram_task = asyncio.create_task(run_worker(self.instagram_worker, 'Instagram'))
        tiktok_task = asyncio.create_task(run_worker(self.tiktok_worker, 'TikTok'))
        website_task = asyncio.create_task(run_worker(self.website_scraper, 'Website'))
        facebook_task = asyncio.create_task(run_worker(self.facebook_worker, 'Facebook'))
        twitter_task = asyncio.create_task(run_worker(self.twitter_worker, 'X (Twitter)'))
        
        results = await asyncio.gather(
            instagram_task,
            tiktok_task,
            website_task,
            facebook_task,
            twitter_task,
            return_exceptions=True
        )
        
        results_dict = {
            'instagram': results[0] if not isinstance(results[0], Exception) else {'status': 'failed', 'error': str(results[0])},
            'tiktok': results[1] if not isinstance(results[1], Exception) else {'status': 'failed', 'error': str(results[1])},
            'website': results[2] if not isinstance(results[2], Exception) else {'status': 'failed', 'error': str(results[2])},
            'facebook': results[3] if not isinstance(results[3], Exception) else {'status': 'failed', 'error': str(results[3])},
            'twitter': results[4] if not isinstance(results[4], Exception) else {'status': 'failed', 'error': str(results[4])},
        }
        
        # Summary
        logger.info("\n" + "=" * 70)
        logger.info("WORKER ORCHESTRATOR - Summary")
        logger.info("=" * 70)
        
        completed = sum(1 for r in results_dict.values() if r['status'] == 'completed')
        failed = sum(1 for r in results_dict.values() if r['status'] == 'failed')
        
        for worker_name, result in results_dict.items():
            status_emoji = "✓" if result['status'] == 'completed' else "✗"
            logger.info(f"{status_emoji} {worker_name.capitalize()}: {result['status']}")
            if result['error']:
                logger.error(f"  Error: {result['error']}")
        
        logger.info(f"\nTotal: {completed} completed, {failed} failed")
        logger.info(f"Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info("=" * 70)
        
        return results_dict


async def main():
    """Main entry point"""
    
    # Setup logging
    logger.add("logs/orchestrator.log", rotation="1 day", retention="7 days")
    
    # Get mode from environment or default to sequential
    mode = os.getenv('WORKER_MODE', 'sequential').lower()
    
    orchestrator = WorkerOrchestrator()
    
    if mode == 'parallel':
        results = await orchestrator.run_all_parallel()
    else:
        results = await orchestrator.run_all_sequential()
    
    # Exit with error code if any worker failed
    if any(r['status'] == 'failed' for r in results.values()):
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    asyncio.run(main())
