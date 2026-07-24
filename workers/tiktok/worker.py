import os
import asyncio
import aiohttp
import re
from typing import List, Dict, Any, Optional
from datetime import datetime
from loguru import logger
from dotenv import load_dotenv

load_dotenv()

# Import shared utilities
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from shared.database import DatabaseManager
from shared.sentiment import sentiment_analyzer


class TikTokWorker:
    """TikTok scraper worker for Festival Mbois"""
    
    def __init__(self):
        self.db = DatabaseManager()
        self.platform_id: Optional[str] = None
        self.keywords: List[str] = []
        self.session: Optional[aiohttp.ClientSession] = None
        
        self.base_url = "https://www.tiktok.com"
        
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
        }
    
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
        
        self.session = aiohttp.ClientSession(headers=self.headers)
        
        logger.info("TikTok worker initialized successfully")
    
    async def close(self):
        """Close connections"""
        if self.session:
            await self.session.close()
        await self.db.close()
        logger.info("TikTok worker closed")
    
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
    
    async def scrape_hashtag(self, hashtag: str) -> List[Dict[str, Any]]:
        """
        Scrape videos by hashtag
        Note: Simplified version for initial implementation
        """
        logger.info(f"Scraping TikTok hashtag: {hashtag}")
        
        videos = []
        
        try:
            # TODO: Implement actual TikTok scraping
            # Options:
            # 1. Use TikTokApi library
            # 2. Use unofficial TikTok API
            # 3. Use Apify or similar service
            # 4. Use Playwright for web scraping
            
            logger.warning(f"TikTok scraping not fully implemented yet for {hashtag}")
            
            # Example structure:
            # videos.append({
            #     'platform_user_id': 'user123',
            #     'username': 'username',
            #     'full_name': 'User Name',
            #     'platform_post_id': 'video123',
            #     'content': 'Video caption',
            #     'likes_count': 1000,
            #     'comments_count': 50,
            #     'shares_count': 20,
            #     'views_count': 10000,
            #     'posted_at': datetime.utcnow(),
            # })
            
        except Exception as e:
            logger.error(f"Error scraping TikTok hashtag {hashtag}: {e}")
        
        return videos
    
    async def process_video(self, video_data: Dict[str, Any]) -> bool:
        """Process and save a single video"""
        try:
            # Upsert influencer
            influencer_data = {
                'platform_id': self.platform_id,
                'platform_user_id': video_data['platform_user_id'],
                'username': video_data['username'],
                'full_name': video_data.get('full_name'),
                'profile_picture_url': video_data.get('profile_picture_url'),
                'followers_count': video_data.get('followers_count', 0),
                'is_verified': video_data.get('is_verified', False),
            }
            
            influencer_id = await self.db.upsert_influencer(influencer_data)
            
            # Analyze sentiment
            sentiment, sentiment_score = sentiment_analyzer.analyze(
                video_data.get('content', '')
            )
            
            # Extract hashtags and mentions
            content = video_data.get('content', '')
            hashtags = self.extract_hashtags(content)
            mentions = self.extract_mentions(content)
            
            # Prepare video data
            video_insert_data = {
                'platform_id': self.platform_id,
                'influencer_id': influencer_id,
                'platform_post_id': video_data['platform_post_id'],
                'post_type': 'video',
                'content': content,
                'media_urls': video_data.get('media_urls', []),
                'post_url': video_data.get('post_url'),
                'likes_count': video_data.get('likes_count', 0),
                'comments_count': video_data.get('comments_count', 0),
                'shares_count': video_data.get('shares_count', 0),
                'views_count': video_data.get('views_count', 0),
                'sentiment': sentiment,
                'sentiment_score': sentiment_score,
                'hashtags': hashtags,
                'mentions': mentions,
                'posted_at': video_data['posted_at'],
                'metadata': video_data.get('metadata'),
            }
            
            # Insert video
            video_id = await self.db.insert_post(video_insert_data)
            
            if video_id:
                for hashtag in hashtags:
                    await self.db.update_hashtag_usage(hashtag)
                
                logger.info(f"Saved video {video_data['platform_post_id']} from @{video_data['username']}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error processing video: {e}")
            return False
    
    async def run(self):
        """Main worker loop"""
        logger.info("Starting TikTok worker...")
        
        job_id = await self.db.create_scraping_job(self.platform_id)
        videos_collected = 0
        errors = 0
        
        try:
            for keyword in self.keywords:
                logger.info(f"Processing keyword: {keyword}")
                
                videos = await self.scrape_hashtag(keyword)
                
                for video in videos:
                    success = await self.process_video(video)
                    if success:
                        videos_collected += 1
                    else:
                        errors += 1
                
                # Rate limiting
                await asyncio.sleep(2)
            
            await self.db.update_scraping_job(
                job_id, 'completed', videos_collected, errors
            )
            
            logger.info(f"TikTok worker completed. Videos: {videos_collected}, Errors: {errors}")
            
        except Exception as e:
            logger.error(f"TikTok worker failed: {e}")
            await self.db.update_scraping_job(
                job_id, 'failed', videos_collected, errors, str(e)
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
