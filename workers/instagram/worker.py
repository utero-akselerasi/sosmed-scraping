"""
Instagram Worker - Web Info Implementation
Festival Mbois Intelligence Platform

This worker scrapes Instagram hashtag data using the current web_info
endpoint (api/v1/tags/web_info/) with a saved Instaloader session, converts
media structs with the official Instaloader parser Post.from_iphone_struct,
and stores the results in the database.

Instaloader's Hashtag.get_posts() still targets the removed explore/tags
endpoint, so extraction here uses Post.from_iphone_struct on the sectional
layout returned by web_info (same approach as test_scrape.py).
"""

import os
import asyncio
import re
from typing import List, Dict, Any, Optional
from loguru import logger
from dotenv import load_dotenv

load_dotenv()

# Import shared utilities
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from shared.database import DatabaseManager
from shared.sentiment import sentiment_analyzer
from shared.worker_lock import WorkerLock

# Try importing instaloader
try:
    import instaloader
    INSTALOADER_AVAILABLE = True
except ImportError:
    INSTALOADER_AVAILABLE = False
    logger.warning("Instaloader not available. Install with: pip install instaloader")


class InstagramWorker:
    """Instagram scraper worker for Festival Mbois"""

    def __init__(self):
        self.db = DatabaseManager()
        self.platform_id: Optional[str] = None
        self.keywords: List[str] = []
        self.loader = None
        self.session_valid = False

        # Configuration
        self.max_posts_per_keyword = int(os.getenv('INSTAGRAM_MAX_POSTS', 50))
        self.session_file = os.getenv('INSTAGRAM_SESSION_FILE', './instagram_session')
        if not os.path.isabs(self.session_file):
            self.session_file = os.path.normpath(
                os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', self.session_file)
            )

        if INSTALOADER_AVAILABLE:
            self.loader = instaloader.Instaloader(
                quiet=True,
                download_videos=False,
                download_video_thumbnails=False,
                download_geotags=False,
                download_comments=False,
                save_metadata=False,
                compress_json=False,
            )
            self.session_valid = self._load_and_validate_session()
        else:
            logger.error("Instaloader tidak tersedia - worker tidak bisa scraping Instagram")

    def _load_and_validate_session(self) -> bool:
        """Load session file and validate it with test_login(). No silent dummy fallback."""
        if not os.path.exists(self.session_file):
            logger.error(f"Instagram session file tidak ditemukan: {self.session_file}")
            logger.error("Jalankan dulu: venv\\Scripts\\python instagram\\create_session_from_cookies.py")
            return False

        try:
            self.loader.load_session_from_file(
                os.getenv('INSTAGRAM_USERNAME') or 'festmbois',
                self.session_file
            )
        except Exception as e:
            logger.error(f"Gagal memuat Instagram session: {e}")
            return False

        try:
            username = self.loader.test_login()
        except Exception as e:
            logger.error(f"Instagram session INVALID (test_login gagal): {e}")
            return False

        if not username:
            logger.error("Instagram session INVALID - tidak ada akun yang login")
            return False

        logger.info(f"Instagram session valid: @{username}")
        return True

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

    def normalize_hashtag(self, keyword: str) -> str:
        """Normalize keyword to an Instagram tag name (no '#', no spaces, lowercase)"""
        if not keyword:
            return ''
        return re.sub(r'\s+', '', keyword.strip().lstrip('#').lower())

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

    def collect_media_structs(self, page_data: dict) -> List[Dict[str, Any]]:
        """Extract media structs from the web_info sectional layout"""
        media_structs = []
        for key in ("top", "recent"):
            block = (page_data.get("data") or {}).get(key)
            if not isinstance(block, dict):
                continue
            for section in block.get("sections", []):
                layout = section.get("layout_content") or {}
                for _, items in layout.items():
                    if not isinstance(items, list):
                        continue
                    for item in items:
                        if not isinstance(item, dict):
                            continue
                        media = item.get("media")
                        if isinstance(media, dict) and media.get("code"):
                            media_structs.append(media)
        return media_structs

    def post_to_data(self, post, struct: Dict[str, Any], clean_hashtag: str) -> Optional[Dict[str, Any]]:
        """Map an Instaloader Post (from_iphone_struct) to worker post data.

        Follower count tidak tersedia di respons web_info; worker memakai satu
        request per tag (mengikuti test_scrape.py) tanpa panggilan tambahan.
        """
        user = struct.get("user") or {}
        if not user.get("pk"):
            logger.warning(f"Media {post.shortcode} tanpa data user - dilewati")
            return None

        platform_user_id = str(user["pk"])
        username = (user.get("username") or (post.owner_profile.username if post.owner_profile else '')).lower()
        full_name = user.get("full_name") or post.owner_profile.full_name or ''
        profile_picture_url = user.get("profile_pic_url") or ''
        is_verified = bool(user.get("is_verified"))
        followers_count = 0

        return {
            'platform_user_id': platform_user_id,
            'username': username,
            'full_name': full_name,
            'profile_picture_url': profile_picture_url,
            'followers_count': followers_count,
            'is_verified': is_verified,

            'platform_post_id': post.shortcode,
            'post_type': 'reel' if post.is_video else 'post',
            'content': post.caption if post.caption else '',
            'media_urls': [post.url],
            'post_url': f"https://www.instagram.com/p/{post.shortcode}/",

            'likes_count': post.likes,
            'comments_count': post.comments,
            'views_count': post.video_view_count if post.is_video else 0,

            'location': '',
            'posted_at': post.date_utc,

            'metadata': {
                'is_video': post.is_video,
                'hashtag_source': clean_hashtag,
            }
        }

    def scrape_hashtag_instaloader(self, hashtag: str) -> List[Dict[str, Any]]:
        """Scrape posts by hashtag via the web_info endpoint + Post.from_iphone_struct"""
        if not INSTALOADER_AVAILABLE or not self.loader:
            logger.error("Instaloader tidak tersedia - tidak bisa scraping Instagram")
            return []

        clean_hashtag = self.normalize_hashtag(hashtag)
        if not clean_hashtag:
            logger.error(f"Keyword '{hashtag}' tidak menghasilkan tag Instagram yang valid")
            return []

        logger.info(f"Scraping Instagram hashtag: #{clean_hashtag} (keyword: {hashtag})")

        try:
            response = self.loader.context.get_iphone_json(
                "api/v1/tags/web_info/",
                {"__a": 1, "__d": "dis", "tag_name": clean_hashtag},
            )
        except Exception as e:
            logger.error(f"Gagal mengambil data hashtag #{clean_hashtag} dari endpoint web_info: {e}")
            return []

        if not isinstance(response, dict) or not (response.get("data") or {}):
            logger.error(f"Response web_info kosong/tidak valid untuk #{clean_hashtag}")
            return []

        media_structs = self.collect_media_structs(response)
        media_structs = list({m["code"]: m for m in media_structs}.values())
        logger.info(f"Media struct unik untuk #{clean_hashtag}: {len(media_structs)}")

        posts_data = []
        for struct in media_structs:
            if len(posts_data) >= self.max_posts_per_keyword:
                logger.info(
                    f"Mencapai batas INSTAGRAM_MAX_POSTS ({self.max_posts_per_keyword}) untuk #{clean_hashtag}"
                )
                break

            try:
                post = instaloader.Post.from_iphone_struct(self.loader.context, struct)
            except Exception as e:
                logger.warning(f"Media {struct.get('code')} gagal dikonversi: {e}")
                continue

            try:
                post_data = self.post_to_data(post, struct, clean_hashtag)
            except Exception as e:
                logger.warning(f"Media {struct.get('code')} gagal dipetakan: {e}")
                continue
            if post_data is None:
                continue

            posts_data.append(post_data)
            logger.debug(f"Scraped post {post.shortcode} dari @{post.owner_username}")

        logger.info(f"Scraped {len(posts_data)} post untuk hashtag #{clean_hashtag}")
        return posts_data

    async def scrape_hashtag(self, hashtag: str) -> List[Dict[str, Any]]:
        """Main scraping method - only real Instagram data, no dummy fallback"""

        posts = self.scrape_hashtag_instaloader(hashtag)
        if not posts:
            logger.error(f"TIDAK ada post real untuk '{hashtag}' - dilewati (tanpa dummy)")

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
            logger.exception(f"Error processing post: {e}")
            return False

    async def run(self):
        """Main worker loop"""
        logger.info("=" * 60)
        logger.info("Starting Instagram worker run...")
        logger.info("=" * 60)

        # Cross-process lock: cegah dua instance Instagram worker berjalan
        # bersamaan (manual Terminal + run_all.py).
        lock = WorkerLock('instagram')
        if not await lock.acquire(self.db):
            logger.warning(
                "Instagram worker dilewati: instance lain sudah berjalan "
                "(lock aktif). Jalankan setelah proses sebelumnya selesai."
            )
            return

        job_id = None
        posts_collected = 0
        errors = 0

        try:
            if not self.session_valid:
                message = "Instagram session INVALID - worker dihentikan, tidak ada fallback dummy"
                logger.error(message)
                job_id = await self.db.create_scraping_job(self.platform_id)
                await self.db.update_scraping_job(job_id, 'failed', 0, 0, message)
                return

            job_id = await self.db.create_scraping_job(self.platform_id)

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
            if job_id:
                await self.db.update_scraping_job(
                    job_id, 'failed', posts_collected, errors, str(e)
                )
        finally:
            await lock.release()


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
