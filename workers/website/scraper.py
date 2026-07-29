import os
import asyncio
import aiohttp
from bs4 import BeautifulSoup
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


class WebsiteScraper:
    """Website scraper worker for Festival Mbois news and articles"""
    
    def __init__(self):
        self.db = DatabaseManager()
        self.platform_id: Optional[str] = None
        self.keywords: List[str] = []
        self.session: Optional[aiohttp.ClientSession] = None
        
        # Target websites (configurable)
        self.target_urls = os.getenv('WEBSITE_URLS', '').split(',')
        
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
    
    async def initialize(self):
        """Initialize worker"""
        logger.info("Initializing Website scraper...")
        
        await self.db.connect()
        
        platform = await self.db.get_platform_by_type('website')
        if not platform:
            raise Exception("Website platform not found in database")
        self.platform_id = platform['id']
        
        self.keywords = await self.db.get_active_keywords()
        logger.info(f"Loaded {len(self.keywords)} keywords: {self.keywords}")
        
        self.session = aiohttp.ClientSession(headers=self.headers)
        
        logger.info("Website scraper initialized successfully")
    
    async def close(self):
        """Close connections"""
        if self.session:
            await self.session.close()
        await self.db.close()
        logger.info("Website scraper closed")
    
    def extract_article_content(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """Extract article content from HTML"""
        article = {}
        
        try:
            # Try to find title
            title_tag = (
                soup.find('h1') or 
                soup.find('title') or 
                soup.find('meta', property='og:title')
            )
            
            if title_tag:
                if title_tag.name == 'meta':
                    article['title'] = title_tag.get('content', '')
                else:
                    article['title'] = title_tag.get_text(strip=True)
            
            # Try to find article content
            content_selectors = [
                'article',
                '.article-content',
                '.post-content',
                '.entry-content',
                'main',
            ]
            
            content = None
            for selector in content_selectors:
                content = soup.select_one(selector)
                if content:
                    break
            
            if content:
                # Extract text from paragraphs
                paragraphs = content.find_all('p')
                article['content'] = ' '.join([p.get_text(strip=True) for p in paragraphs])
            
            # Extract published date
            date_selectors = [
                'time',
                '.published',
                '.post-date',
                '[datetime]',
            ]
            
            for selector in date_selectors:
                date_elem = soup.select_one(selector)
                if date_elem:
                    datetime_str = date_elem.get('datetime') or date_elem.get_text(strip=True)
                    # Try to parse date (simplified)
                    article['published_at'] = datetime_str
                    break
            
            # Extract images
            images = []
            img_tags = soup.find_all('img')
            for img in img_tags[:5]:  # Limit to 5 images
                src = img.get('src') or img.get('data-src')
                if src and src.startswith('http'):
                    images.append(src)
            article['images'] = images
            
        except Exception as e:
            logger.error(f"Error extracting article content: {e}")
        
        return article
    
    def check_keyword_match(self, text: str) -> bool:
        """Check if text contains any keywords"""
        if not text:
            return False
        
        text_lower = text.lower()
        for keyword in self.keywords:
            if keyword.lower() in text_lower:
                return True
        return False
    
    async def scrape_url(self, url: str) -> List[Dict[str, Any]]:
        """Scrape a single URL"""
        logger.info(f"Scraping URL: {url}")
        
        articles = []
        
        try:
            async with self.session.get(url, timeout=30) as response:
                if response.status == 200:
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    # Extract article
                    article_data = self.extract_article_content(soup)
                    
                    # Check if article mentions keywords
                    full_text = f"{article_data.get('title', '')} {article_data.get('content', '')}"
                    
                    if self.check_keyword_match(full_text):
                        article_data['url'] = url
                        articles.append(article_data)
                        logger.info(f"Found relevant article: {article_data.get('title', 'Untitled')}")
                    
        except Exception as e:
            logger.error(f"Error scraping {url}: {e}")
        
        return articles
    
    async def process_article(self, article_data: Dict[str, Any]) -> bool:
        """Process and save a single article"""
        try:
            # Create a pseudo-influencer for the website
            domain = article_data['url'].split('/')[2]
            
            influencer_data = {
                'platform_id': self.platform_id,
                'platform_user_id': domain,
                'username': domain,
                'full_name': domain,
            }
            
            influencer_id = await self.db.upsert_influencer(influencer_data)
            
            # Analyze sentiment
            content = f"{article_data.get('title', '')} {article_data.get('content', '')}"
            sentiment, sentiment_score = sentiment_analyzer.analyze(content)
            
            # Generate post ID from URL
            post_id = article_data['url'].split('/')[-1] or str(hash(article_data['url']))
            
            # Prepare article data
            article_insert_data = {
                'platform_id': self.platform_id,
                'influencer_id': influencer_id,
                'platform_post_id': post_id,
                'post_type': 'article',
                'content': content[:5000],  # Limit content length
                'media_urls': article_data.get('images', []),
                'post_url': article_data['url'],
                'sentiment': sentiment,
                'sentiment_score': sentiment_score,
                'posted_at': datetime.utcnow(),  # Use current time if no date found
                'metadata': {
                    'title': article_data.get('title'),
                    'source': domain,
                },
            }
            
            # Insert article
            article_id = await self.db.insert_post(article_insert_data)
            
            if article_id:
                logger.info(f"Saved article from {domain}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error processing article: {e}")
            return False
    
    async def run(self):
        """Main worker loop"""
        logger.info("Starting Website scraper...")
        
        job_id = await self.db.create_scraping_job(self.platform_id)
        articles_collected = 0
        errors = 0
        
        try:
            for url in self.target_urls:
                if not url or not url.startswith('http'):
                    continue
                
                logger.info(f"Processing URL: {url}")
                
                articles = await self.scrape_url(url)
                
                for article in articles:
                    success = await self.process_article(article)
                    if success:
                        articles_collected += 1
                    else:
                        errors += 1
                
                # Rate limiting
                await asyncio.sleep(3)
            
            await self.db.update_scraping_job(
                job_id, 'completed', articles_collected, errors
            )
            
            logger.info(f"Website scraper completed. Articles: {articles_collected}, Errors: {errors}")
            
        except Exception as e:
            logger.error(f"Website scraper failed: {e}")
            await self.db.update_scraping_job(
                job_id, 'failed', articles_collected, errors, str(e)
            )


async def main():
    """Main entry point"""
    logger.add("logs/website_scraper.log", rotation="1 day", retention="7 days")
    logger.info("=" * 60)
    logger.info("Website Scraper - Festival Mbois Intelligence Platform")
    logger.info("=" * 60)
    
    scraper = WebsiteScraper()
    
    try:
        await scraper.initialize()
        await scraper.run()
    except Exception as e:
        logger.error(f"Scraper error: {e}")
    finally:
        await scraper.close()


if __name__ == "__main__":
    asyncio.run(main())
