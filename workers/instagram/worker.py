import os
import asyncio
import aiohttp
import re
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from loguru import logger
from dotenv import load_dotenv
import json

load_dotenv()

# Import shared utilities
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from shared.database import DatabaseManager
from shared.sentiment import sentiment_analyzer


class InstagramWorker:
    """Instagram scraper worker for Festival Mbois"""
    
    def __init__(self):
        self.db = DatabaseManager()
        self.platform_id: Optional[str] = None
        self.keywords: List[str] = []
        self.session: Optional[aiohttp.ClientSession] = None
        
        # Instagram API endpoints (web scraping approach)
        self.base_url = "https://www.instagram.com"
        
        # Headers to mimic browser
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
        }
    
    async def initialize(self):
        """Initialize worker"""
        logger.info("Initializing Instagram worker...")
        
        # Connect to database
        await self.db.connect()
        
        # Get platform ID
        platform = await self.db.get_platform_by_type('instagram')
        if not platform:
            raise Exception("Instagram platform not found in database")
        self.platform_id = platform['id']
        
        # Get keywords
        self.keywords = await self.db.get_active_keywords()
        logger.info(f"Loaded {len(self.keywords)} keywords: {self.keywords}")
        
        # Create aiohttp session
        self.session = aiohttp.ClientSession(headers=self.headers)
        
        logger.info("Instagram worker initialized successfully")
    
    async def close(self):
        """Close connections"""
        if self.session:
            await self.session.close()
        await self.db.close()
        logger.info("Instagram worker closed")
    
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
        Scrape posts by hashtag
        Note: This is a simplified version. In production, you might need:
        - Instagram API access
        - Proper authentication
        - Or use libraries like instaloader
        """
        logger.info(f"Scraping hashtag: {hashtag}")
        
        posts = []
        
        # For demo purposes, we'll create sample data structure
        # In production, implement actual scraping logic
        
        try:
            # Sample implementation - replace with actual scraping
            # For now, we'll return empty to avoid hitting Instagram without proper setup
            
            # TODO: Implement actual Instagram scraping
            # Options:
            # 1. Use instaloader library
            # 2. Use Instagram Graph API (requires business account)
            # 3. Use Apify or similar scraping service
            
            logger.warning(f"Instagram scraping not fully implemented yet for {hashtag}")
            
            # Example structure of what we'd return:
            # posts.append({
            #     'platform_user_id': 'user123',
            #     'username': 'username',
            #     'full_name': 'User Full Name',
            #     'platform_post_id': 'post123',
            #     'content': 'Post caption text',
            #     'likes_count': 100,
            #     'comments_count': 10,
            #     'posted_at': datetime.utcnow(),
            # })
            
        except Exception as e:
            logger.error(f"Error scraping hashtag {hashtag}: {e}")
        
        return posts
    
    async def process_post(self, post_data: Dict[str, Any]) -> bool:
        """Process and save a single post"""
        try:
            # First, upsert influencer
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
            
            # Analyze sentiment
            sentiment, sentiment_score = sentiment_analyzer.analyze(
                post_data.get('content', '')
            )
            
            # Extract hashtags and mentions
            content = post_data.get('content', '')
            hashtags = self.extract_hashtags(content)
            mentions = self.extract_mentions(content)
            
            # Prepare post data
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
                'views_count': post_data.get('views_count', 0),
                'sentiment': sentiment,
                'sentiment_score': sentiment_score,
                'hashtags': hashtags,
                'mentions': mentions,
                'posted_at': post_data['posted_at'],
                'metadata': post_data.get('metadata'),
            }
            
            # Insert post
            post_id = await self.db.insert_post(post_insert_data)
            
            if post_id:
                # Update hashtag usage
                for hashtag in hashtags:
                    await self.db.update_hashtag_usage(hashtag)
                
                logger.info(f"Saved post {post_data['platform_post_id']} from @{post_data['username']}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error processing post: {e}")
            return False
    
    async def run(self):
        """Main worker loop"""
        logger.info("Starting Instagram worker...")
        
        job_id = await self.db.create_scraping_job(self.platform_id)
        posts_collected = 0
        errors = 0
        
        try:
            for keyword in self.keywords:
                logger.info(f"Processing keyword: {keyword}")
                
                # Scrape posts for this keyword/hashtag
                posts = await self.scrape_hashtag(keyword)
                
                for post in posts:
                    success = await self.process_post(post)
                    if success:
                        posts_collected += 1
                    else:
                        errors += 1
                
                # Rate limiting - be nice to Instagram
                await asyncio.sleep(2)
            
            # Update job as completed
            await self.db.update_scraping_job(
                job_id, 'completed', posts_collected, errors
            )
            
            logger.info(f"Instagram worker completed. Posts: {posts_collected}, Errors: {errors}")
            
        except Exception as e:
            logger.error(f"Instagram worker failed: {e}")
            await self.db.update_scraping_job(
                job_id, 'failed', posts_collected, errors, str(e)
            )


async def main():
    """Main entry point"""
    logger.add("logs/instagram_worker.log", rotation="1 day", retention="7 days")
    logger.info("=" * 60)
    logger.info("Instagram Worker - Festival Mbois Intelligence Platform")
    logger.info("=" * 60)
    
    worker = InstagramWorker()
    
    try:
        await worker.initialize()
        await worker.run()
    except Exception as e:
        logger.error(f"Worker error: {e}")
    finally:
        await worker.close()


if __name__ == "__main__":
    asyncio.run(main())
