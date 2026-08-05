import os
import json
import asyncpg
from typing import Optional, Dict, Any, List
from datetime import datetime
from loguru import logger
from dotenv import load_dotenv

load_dotenv()


class DatabaseManager:
    """Database manager for PostgreSQL connections"""
    
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
        self.db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': int(os.getenv('DB_PORT', 5432)),
            'database': os.getenv('DB_NAME', 'festival_mbois'),
            'user': os.getenv('DB_USER', 'mbois_user'),
            'password': os.getenv('DB_PASSWORD', 'mbois_password_2026'),
        }
    
    async def connect(self):
        """Create database connection pool"""
        try:
            self.pool = await asyncpg.create_pool(**self.db_config, min_size=2, max_size=10)
            logger.info("Database connection pool created")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise
    
    async def close(self):
        """Close database connection pool"""
        if self.pool:
            await self.pool.close()
            logger.info("Database connection pool closed")
    
    async def get_platform_by_type(self, platform_type: str) -> Optional[Dict[str, Any]]:
        """Get platform by type"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM platforms WHERE type = $1 AND is_active = true",
                platform_type
            )
            return dict(row) if row else None
    
    async def get_active_keywords(self) -> List[str]:
        """Get all active keywords"""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT keyword FROM keywords WHERE is_active = true ORDER BY priority DESC"
            )
            return [row['keyword'] for row in rows]
    
    async def upsert_influencer(self, data: Dict[str, Any]) -> str:
        """Insert or update influencer"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow("""
                INSERT INTO influencers (
                    platform_id, platform_user_id, username, full_name,
                    profile_picture_url, bio, followers_count, following_count,
                    posts_count, engagement_rate, is_verified, metadata, last_scraped_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                ON CONFLICT (platform_id, platform_user_id)
                DO UPDATE SET
                    username = EXCLUDED.username,
                    full_name = EXCLUDED.full_name,
                    profile_picture_url = EXCLUDED.profile_picture_url,
                    bio = EXCLUDED.bio,
                    followers_count = EXCLUDED.followers_count,
                    following_count = EXCLUDED.following_count,
                    posts_count = EXCLUDED.posts_count,
                    engagement_rate = EXCLUDED.engagement_rate,
                    is_verified = EXCLUDED.is_verified,
                    metadata = EXCLUDED.metadata,
                    last_scraped_at = EXCLUDED.last_scraped_at,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id
            """,
                data['platform_id'], data['platform_user_id'], data['username'],
                data.get('full_name'), data.get('profile_picture_url'),
                data.get('bio'), data.get('followers_count') or 0,
                data.get('following_count') or 0, data.get('posts_count') or 0,
                data.get('engagement_rate') or 0, data.get('is_verified') or False,
                data.get('metadata'), datetime.utcnow()
            )
            return row['id']
    
    async def insert_post(self, data: Dict[str, Any]) -> Optional[str]:
        """Insert post (skip if exists)"""
        async with self.pool.acquire() as conn:
            try:
                row = await conn.fetchrow("""
                    INSERT INTO posts (
                        platform_id, influencer_id, platform_post_id, post_type,
                        content, media_urls, post_url, likes_count, comments_count,
                        shares_count, views_count, sentiment, sentiment_score,
                        hashtags, mentions, location, posted_at, metadata
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
                    ON CONFLICT (platform_id, platform_post_id, posted_at) DO NOTHING
                    RETURNING id
                """,
                    data['platform_id'], data['influencer_id'], data['platform_post_id'],
                    data['post_type'], data.get('content'), data.get('media_urls', []),
                    data.get('post_url'), data.get('likes_count') or 0,
                    data.get('comments_count') or 0, data.get('shares_count') or 0,
                    data.get('views_count') or 0, data.get('sentiment'),
                    data.get('sentiment_score'), data.get('hashtags', []),
                    data.get('mentions', []), data.get('location'),
                    data['posted_at'], json.dumps(data.get('metadata')) if data.get('metadata') else None
                )
                return row['id'] if row else None
            except Exception as e:
                logger.error(
                    f"Failed to insert post: {e} "
                    f"(platform_post_id={data.get('platform_post_id')}, "
                    f"post_url={data.get('post_url')}, "
                    f"posted_at={data.get('posted_at')})"
                )
                return None
    
    async def update_hashtag_usage(self, hashtag: str):
        """Update or insert hashtag usage"""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO hashtags (hashtag, usage_count, first_seen_at, last_seen_at)
                VALUES ($1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT (hashtag)
                DO UPDATE SET
                    usage_count = hashtags.usage_count + 1,
                    last_seen_at = CURRENT_TIMESTAMP
            """, hashtag)
    
    async def create_scraping_job(self, platform_id: str) -> str:
        """Create new scraping job"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow("""
                INSERT INTO scraping_jobs (platform_id, status, started_at)
                VALUES ($1, 'running', CURRENT_TIMESTAMP)
                RETURNING id
            """, platform_id)
            return row['id']
    
    async def update_scraping_job(self, job_id: str, status: str, 
                                   posts_collected: int = 0, 
                                   errors_count: int = 0,
                                   error_message: str = None):
        """Update scraping job status"""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                UPDATE scraping_jobs
                SET status = $1, completed_at = CURRENT_TIMESTAMP,
                    posts_collected = $2, errors_count = $3, error_message = $4
                WHERE id = $5
            """, status, posts_collected, errors_count, error_message, job_id)
