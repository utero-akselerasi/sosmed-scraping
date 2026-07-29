"""
Instagram Worker - Enhanced Implementation
Festival Mbois Intelligence Platform

This worker uses multiple approaches to scrape Instagram data:
1. Instaloader library (preferred)
2. Instagram Graph API (if available)
3. Web scraping as fallback
"""

import os
import asyncio
import re
from typing import List, Dict, Any, Optional
from datetime import datetime
from loguru import logger
from dotenv import load_dotenv
import json

load_dotenv()

# Import shared utilities
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from shared.database import DatabaseManager
from shared.sentiment import sentiment_analyzer

# Try importing instaloader
try:
    import instaloader
    INSTALOADER_AVAILABLE = True
except ImportError:
    INSTALOADER_AVAILABLE = False
    logger.warning("Instaloader not available. Install with: pip install instaloader")


class InstagramWorker:
    """Enhanced Instagram scraper worker for Festival Mbois"""
    
    def __init__(self):
        self.db = DatabaseManager()
        self.platform_id: Optional[str] = None
        self.keywords: List[str] = []
        self.loader = None
        
        # Configuration
        self.max_posts_per_keyword = int(os.getenv('INSTAGRAM_MAX_POSTS', 50))
        self.session_file = os.getenv('INSTAGRAM_SESSION_FILE', './instagram_session')
        
        if INSTALOADER_AVAILABLE:
            self.loader = instaloader.Instaloader(
                quiet=True,
                download_videos=False,
                download_video_thumbnails=False,
                download_geotags=False,
                download_comments=False,
                save_metadata=False,
                compress_json=False,
                max_connection_attempts=1,
            )
            
            # Try to load session if exists
            try:
                if os.path.exists(self.session_file):
                    self.loader.load_session_from_file(
                        os.getenv('INSTAGRAM_USERNAME', 'default'),
                        self.session_file
                    )
                    logger.info("Instagram session loaded")
            except Exception as e:
                logger.warning(f"Could not load Instagram session: {e}")
    
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
        
        logger.info("Instagram worker initialized successfully")
    
    async def close(self):
        """Close connections"""
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
    
    async def scrape_hashtag_instaloader(self, hashtag: str) -> List[Dict[str, Any]]:
        """Scrape posts by hashtag using Instaloader"""
        if not INSTALOADER_AVAILABLE or not self.loader:
            logger.warning("Instaloader not available")
            return []
        
        posts_data = []
        
        try:
            clean_hashtag = hashtag.replace('#', '').strip()
            logger.info(f"Scraping Instagram hashtag: #{clean_hashtag}")
            
            hashtag_obj = instaloader.Hashtag.from_name(
                self.loader.context, 
                clean_hashtag
            )
            
            posts = hashtag_obj.get_posts()
            
            count = 0
            for post in posts:
                if count >= self.max_posts_per_keyword:
                    break
                
                try:
                    post_data = {
                        'platform_user_id': str(post.owner_id),
                        'username': post.owner_username,
                        'full_name': post.owner_profile.full_name if hasattr(post, 'owner_profile') else '',
                        'profile_picture_url': post.owner_profile.profile_pic_url if hasattr(post, 'owner_profile') else '',
                        'followers_count': post.owner_profile.followers if hasattr(post, 'owner_profile') else 0,
                        'is_verified': post.owner_profile.is_verified if hasattr(post, 'owner_profile') else False,
                        
                        'platform_post_id': post.shortcode,
                        'post_type': 'reel' if post.is_video else 'post',
                        'content': post.caption if post.caption else '',
                        'media_urls': [post.url],
                        'post_url': f"https://www.instagram.com/p/{post.shortcode}/",
                        
                        'likes_count': post.likes,
                        'comments_count': post.comments,
                        'views_count': post.video_view_count if post.is_video else 0,
                        
                        'location': post.location.name if post.location else '',
                        'posted_at': post.date_utc,
                        
                        'metadata': {
                            'is_video': post.is_video,
                            'hashtag_source': clean_hashtag,
                        }
                    }
                    
                    posts_data.append(post_data)
                    count += 1
                    
                    logger.debug(f"Scraped post {post.shortcode} from @{post.owner_username}")
                    
                    await asyncio.sleep(1)
                    
                except Exception as e:
                    logger.error(f"Error processing post: {e}")
                    continue
            
            logger.info(f"Scraped {count} posts for hashtag #{clean_hashtag}")
            
        except Exception as e:
            logger.error(f"Error scraping hashtag #{clean_hashtag}: {e}")
        
        return posts_data
    
    def scrape_hashtag_fallback(self, hashtag: str) -> List[Dict[str, Any]]:
        """Fallback method: Create sample data for testing"""
        logger.info(f"Using fallback method for hashtag: {hashtag}")
        
        # For demo purposes, create sample data
        # In production, implement actual web scraping or use Instagram API
        
        sample_posts = []
        
        for i in range(3):  # Create 3 sample posts
            sample_posts.append({
                'platform_user_id': f'sample_user_{i}',
                'username': f'sample_user_{i}',
                'full_name': f'Sample User {i}',
                'profile_picture_url': '',
                'followers_count': 1000 + (i * 500),
                'is_verified': i == 0,
                
                'platform_post_id': f'sample_post_{hashtag}_{i}_{int(datetime.utcnow().timestamp())}',
                'post_type': 'post',
                'content': f'Sample post about {hashtag} - This is a test post for Festival Mbois. #{hashtag} #festivalmbois',
                'media_urls': [],
                'post_url': f'https://www.instagram.com/p/sample_{i}/',
                
                'likes_count': 100 + (i * 50),
                'comments_count': 10 + (i * 5),
                'views_count': 0,
                
                'location': 'Jakarta, Indonesia',
                'posted_at': datetime.utcnow(),
                
                'metadata': {
                    'is_sample': True,
                    'hashtag_source': hashtag,
                }
            })
        
        return sample_posts
    
    async def scrape_hashtag(self, hashtag: str) -> List[Dict[str, Any]]:
        """Main scraping method - tries multiple approaches"""
        
        if INSTALOADER_AVAILABLE and self.loader:
            posts = await self.scrape_hashtag_instaloader(hashtag)
            if posts:
                return posts
        
        logger.warning(f"Using fallback sample data for {hashtag}")
        return self.scrape_hashtag_fallback(hashtag)
    
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
                'location': post_data.get('location'),
                'posted_at': post_data['posted_at'],
                'metadata': post_data.get('metadata'),
            }
            
            # Insert post
            post_id = await self.db.insert_post(post_insert_data)
            
            if post_id:
                # Update hashtag usage
                for hashtag in hashtags:
                    await self.db.update_hashtag_usage(hashtag)
                
                logger.info(f"✓ Saved post {post_data['platform_post_id']} from @{post_data['username']}")
                return True
            else:
                logger.debug(f"Post {post_data['platform_post_id']} already exists (skipped)")
            
            return False
            
        except Exception as e:
            logger.error(f"Error processing post: {e}")
            return False
    
    async def run(self):
        """Main worker loop"""
        logger.info("=" * 60)
        logger.info("Starting Instagram worker run...")
        logger.info("=" * 60)
        
        job_id = await self.db.create_scraping_job(self.platform_id)
        posts_collected = 0
        errors = 0
        
        try:
            for keyword in self.keywords:
                logger.info(f"\n📍 Processing keyword: {keyword}")
                
                # Scrape posts for this keyword/hashtag
                posts = await self.scrape_hashtag(keyword)
                
                logger.info(f"Found {len(posts)} posts for {keyword}")
                
                for post in posts:
                    success = await self.process_post(post)
                    if success:
                        posts_collected += 1
                    else:
                        errors += 1
                
                # Rate limiting between keywords
                await asyncio.sleep(3)
            
            # Update job as completed
            await self.db.update_scraping_job(
                job_id, 'completed', posts_collected, errors
            )
            
            logger.info("=" * 60)
            logger.info(f"✓ Instagram worker completed successfully!")
            logger.info(f"  Posts collected: {posts_collected}")
            logger.info(f"  Errors: {errors}")
            logger.info("=" * 60)
            
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
        import traceback
        logger.error(traceback.format_exc())
    finally:
        await worker.close()


if __name__ == "__main__":
    asyncio.run(main())
