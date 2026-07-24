# Python Workers - Festival Mbois Intelligence Platform

## Overview

Python-based worker services for scraping social media platforms and websites.

## Workers

### 1. Instagram Worker (`instagram/worker.py`)
- Scrapes Instagram posts, reels, stories
- Searches by hashtags and keywords
- Extracts engagement metrics

### 2. TikTok Worker (`tiktok/worker.py`)
- Scrapes TikTok videos
- Searches by hashtags
- Extracts views, likes, comments, shares

### 3. Website Scraper (`website/scraper.py`)
- Scrapes news articles and blog posts
- Searches for keyword mentions
- Extracts article content and metadata

## Shared Utilities

### Database Manager (`shared/database.py`)
- PostgreSQL connection pool
- CRUD operations for all entities
- Async operations with asyncpg

### Sentiment Analyzer (`shared/sentiment.py`)
- Rule-based sentiment analysis
- Indonesian language support
- Emoticon detection
- Returns: positive/neutral/negative

## Installation

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# For Indonesian NLP
python -m nltk.downloader stopwords
```

## Configuration

Copy `.env.example` to `.env` and configure:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=festival_mbois
DB_USER=mbois_user
DB_PASSWORD=mbois_password_2026

REDIS_HOST=localhost
REDIS_PORT=6379

# Worker settings
WORKER_INTERVAL=900000
INSTAGRAM_ENABLED=true
TIKTOK_ENABLED=true
WEBSITE_ENABLED=true
WEBSITE_URLS=https://example.com,https://news.example.com
```

## Running Workers

### Manual Execution

```bash
# Instagram worker
python instagram/worker.py

# TikTok worker
python tiktok/worker.py

# Website scraper
python website/scraper.py
```

### Scheduled Execution (Recommended)

Use cron (Linux) or Task Scheduler (Windows) to run workers periodically:

```bash
# Run every 15 minutes
*/15 * * * * cd /path/to/workers && venv/bin/python instagram/worker.py
*/15 * * * * cd /path/to/workers && venv/bin/python tiktok/worker.py
0 * * * * cd /path/to/workers && venv/bin/python website/scraper.py
```

## Logging

All workers log to:
- Console output
- `logs/{worker_name}.log` files
- Rotated daily, kept for 7 days

## Development Status

### ✅ Completed
- Database manager with async support
- Sentiment analyzer (rule-based)
- Worker structure and scaffolding
- Error handling and logging
- Job tracking in database

### 🚧 In Progress
- Instagram scraping implementation (needs API/library integration)
- TikTok scraping implementation (needs API/library integration)
- Website scraping (basic implementation done)

### 📋 TODO
- Implement actual Instagram scraping (instaloader or API)
- Implement actual TikTok scraping (TikTokApi or API)
- Add proxy support for rate limiting
- Add retry logic with exponential backoff
- Implement comment scraping
- Add AI-based sentiment analysis (IndoBERT)
- Add more sophisticated NLP features

## Architecture

```
workers/
├── instagram/
│   └── worker.py           # Instagram scraper
├── tiktok/
│   └── worker.py           # TikTok scraper
├── website/
│   └── scraper.py          # Website scraper
├── shared/
│   ├── database.py         # Database utilities
│   └── sentiment.py        # Sentiment analysis
├── requirements.txt        # Python dependencies
└── README.md              # This file
```

## Data Flow

1. Worker initializes and connects to database
2. Fetches active keywords from database
3. Scrapes platform for each keyword
4. For each post/video/article:
   - Extracts metadata and content
   - Analyzes sentiment
   - Upserts influencer/author
   - Inserts post with sentiment
   - Updates hashtag usage
5. Updates scraping job status
6. Closes connections

## Error Handling

- All errors are logged with context
- Failed items don't stop the entire job
- Job status tracks errors count
- Workers can be safely restarted

## Rate Limiting

- Built-in delays between requests (2-3 seconds)
- Respects platform ToS
- TODO: Add proxy rotation for higher volume

## Security

- Never commit `.env` file
- Use environment variables for credentials
- Sanitize user input
- Use parameterized queries (SQL injection prevention)

## Performance

- Async/await for concurrent operations
- Connection pooling for database
- Batch processing where possible
- Efficient memory usage

## Monitoring

Workers report to `scraping_jobs` table:
- Job start/end time
- Items collected
- Error count
- Status (pending/running/completed/failed)

Query recent jobs:
```sql
SELECT * FROM scraping_jobs 
ORDER BY created_at DESC 
LIMIT 10;
```

## Troubleshooting

### Worker won't connect to database
- Check database is running: `docker ps`
- Verify credentials in `.env`
- Check network connectivity

### No data being collected
- Verify keywords are active in database
- Check worker logs for errors
- Ensure platform credentials are valid

### Sentiment analysis not working
- Install NLTK data: `python -m nltk.downloader stopwords`
- Check Sastrawi installation
- Verify text encoding (UTF-8)

## Contributing

When adding new workers:
1. Create new directory under `workers/`
2. Use shared utilities (database, sentiment)
3. Follow existing error handling patterns
4. Add logging
5. Update this README

## Next Steps

Week 1 (Current):
- [x] Database manager
- [x] Sentiment analyzer
- [x] Worker scaffolding
- [ ] Implement actual Instagram scraping
- [ ] Implement actual TikTok scraping
- [ ] Test with real data

Week 2:
- [ ] Add comment scraping
- [ ] Implement AI sentiment (IndoBERT)
- [ ] Add proxy support
- [ ] Performance optimization

---

**Created by:** Kharisman (maskhar.com)  
**Organization:** Utero Indonesia  
**Project:** Festival Mbois Intelligence Platform
