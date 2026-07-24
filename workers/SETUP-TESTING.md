# Workers Setup & Testing Guide
# Festival Mbois Intelligence Platform

## Quick Setup

### 1. Create Virtual Environment
```bash
cd workers
python -m venv venv

# Activate
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt

# Download NLTK data
python -c "import nltk; nltk.download('stopwords')"
```

### 3. Configure Environment
```bash
# Copy .env from root
cp ../.env .env

# Or set these variables:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=festival_mbois
DB_USER=mbois_user
DB_PASSWORD=mbois_password_2026

INSTAGRAM_MAX_POSTS=50
TIKTOK_MAX_VIDEOS=50
WEBSITE_URLS=https://example.com

WORKER_MODE=sequential  # or parallel
```

---

## Running Workers

### Run Individual Workers

#### Instagram Worker
```bash
python instagram/worker.py
```

#### TikTok Worker
```bash
python tiktok/worker.py
```

#### Website Scraper
```bash
python website/scraper.py
```

### Run All Workers

#### Sequential Mode (One after another)
```bash
python run_all.py
```

#### Parallel Mode (All at once)
```bash
WORKER_MODE=parallel python run_all.py
```

---

## Worker Features

### Instagram Worker
**Status:** ✅ Enhanced with Instaloader support

**Features:**
- Instaloader integration for real scraping
- Fallback to sample data if library not available
- Hashtag search
- Profile data extraction
- Engagement metrics
- Rate limiting
- Error handling

**Configuration:**
- `INSTAGRAM_MAX_POSTS` - Max posts per keyword (default: 50)
- `INSTAGRAM_SESSION_FILE` - Session file path (optional)
- `INSTAGRAM_USERNAME` - Instagram username (optional, for session)

**Note:** For production use with real data:
1. Install: `pip install instaloader`
2. Optionally login: `instaloader --login=YOUR_USERNAME`
3. Session will be saved and reused

### TikTok Worker
**Status:** ✅ Enhanced with TikTokApi support

**Features:**
- TikTokApi integration (structure ready)
- Fallback to sample data
- Hashtag search
- Video metadata extraction
- Engagement metrics
- Rate limiting

**Configuration:**
- `TIKTOK_MAX_VIDEOS` - Max videos per keyword (default: 50)

**Note:** TikTokApi implementation may need adjustment based on library version

### Website Scraper
**Status:** ✅ Working with BeautifulSoup

**Features:**
- Multi-URL scraping
- Article extraction
- Content parsing
- Keyword matching
- Metadata extraction

**Configuration:**
- `WEBSITE_URLS` - Comma-separated URLs
- `WEBSITE_ENABLED` - Enable/disable (default: true)

---

## Testing Workers

### Test Database Connection
```bash
python -c "
import asyncio
from shared.database import DatabaseManager

async def test():
    db = DatabaseManager()
    await db.connect()
    platforms = await db.get_platform_by_type('instagram')
    print(f'Platform: {platforms}')
    await db.close()

asyncio.run(test())
"
```

### Test Sentiment Analysis
```bash
python -c "
from shared.sentiment import sentiment_analyzer

text = 'Festival Mbois sangat seru dan menyenangkan! #festivalmbois'
sentiment, score = sentiment_analyzer.analyze(text)
print(f'Sentiment: {sentiment}, Score: {score}')
"
```

### Test Individual Worker (Dry Run)
```bash
# This will use sample data
python instagram/worker.py
```

---

## Logs

All workers log to:
- Console output
- `logs/<worker_name>.log` files

**Log Files:**
- `logs/instagram_worker.log`
- `logs/tiktok_worker.log`
- `logs/website_scraper.log`
- `logs/orchestrator.log`

**Log Rotation:**
- Daily rotation
- 7 days retention

**View Logs:**
```bash
# Real-time
tail -f logs/instagram_worker.log

# All logs
tail -f logs/*.log
```

---

## Scheduling Workers

### Manual Cron (Linux/Mac)
```bash
# Edit crontab
crontab -e

# Run every 15 minutes
*/15 * * * * cd /path/to/workers && venv/bin/python run_all.py >> logs/cron.log 2>&1

# Run every hour
0 * * * * cd /path/to/workers && venv/bin/python run_all.py

# Run daily at 2 AM
0 2 * * * cd /path/to/workers && venv/bin/python run_all.py
```

### Windows Task Scheduler
```powershell
# Create scheduled task
# 1. Open Task Scheduler
# 2. Create Basic Task
# 3. Set trigger (e.g., every 15 minutes)
# 4. Set action: 
#    Program: C:\path\to\workers\venv\Scripts\python.exe
#    Arguments: run_all.py
#    Start in: C:\path\to\workers
```

### Using systemd (Linux)
```bash
# Create service file: /etc/systemd/system/mbois-workers.service
[Unit]
Description=Festival Mbois Workers
After=network.target postgresql.service

[Service]
Type=oneshot
User=your_user
WorkingDirectory=/path/to/workers
ExecStart=/path/to/workers/venv/bin/python run_all.py

[Install]
WantedBy=multi-user.target

# Create timer: /etc/systemd/system/mbois-workers.timer
[Unit]
Description=Run Festival Mbois Workers every 15 minutes

[Timer]
OnBootSec=5min
OnUnitActiveSec=15min

[Install]
WantedBy=timers.target

# Enable and start
sudo systemctl enable mbois-workers.timer
sudo systemctl start mbois-workers.timer
sudo systemctl status mbois-workers.timer
```

---

## Troubleshooting

### Worker can't connect to database
```bash
# Check database is running
docker ps | grep postgres

# Check connection
psql -h localhost -U mbois_user -d festival_mbois

# Check .env file
cat .env | grep DB_
```

### No data being collected
```bash
# Check keywords in database
psql -h localhost -U mbois_user -d festival_mbois -c "SELECT * FROM keywords WHERE is_active = true;"

# Check scraping jobs
psql -h localhost -U mbois_user -d festival_mbois -c "SELECT * FROM scraping_jobs ORDER BY created_at DESC LIMIT 5;"

# Check logs
tail -f logs/instagram_worker.log
```

### Instaloader not working
```bash
# Install dependencies
pip install instaloader

# Test import
python -c "import instaloader; print('OK')"

# Try login (optional)
instaloader --login=YOUR_USERNAME
```

### Sentiment analysis errors
```bash
# Download NLTK data
python -c "import nltk; nltk.download('stopwords'); nltk.download('punkt')"

# Test Sastrawi
python -c "from Sastrawi.Stemmer.StemmerFactory import StemmerFactory; print('OK')"
```

---

## Performance Tips

1. **Rate Limiting:** Workers have built-in delays (2-3 seconds)
2. **Batch Size:** Adjust `MAX_POSTS` / `MAX_VIDEOS` per keyword
3. **Parallel Mode:** Use for faster collection (but more resources)
4. **Database Indexes:** Already optimized in schema
5. **Connection Pool:** Database manager uses connection pooling

---

## Development

### Add New Worker

1. Create directory: `workers/newplatform/`
2. Create `worker.py`:
```python
import asyncio
from shared.database import DatabaseManager
from shared.sentiment import sentiment_analyzer

class NewPlatformWorker:
    async def initialize(self):
        self.db = DatabaseManager()
        await self.db.connect()
        # ... initialize
    
    async def run(self):
        # ... scraping logic
        pass
    
    async def close(self):
        await self.db.close()

async def main():
    worker = NewPlatformWorker()
    await worker.initialize()
    await worker.run()
    await worker.close()

if __name__ == "__main__":
    asyncio.run(main())
```

3. Add to `run_all.py`
4. Update requirements.txt

### Testing
```bash
# Run tests
pytest tests/

# With coverage
pytest --cov=. tests/
```

---

## Production Checklist

- [ ] All dependencies installed
- [ ] Database connection tested
- [ ] Environment variables configured
- [ ] Logging working
- [ ] Rate limiting tested
- [ ] Error handling verified
- [ ] Scheduling configured
- [ ] Monitoring setup
- [ ] Backup strategy in place

---

## Next Steps

1. ✅ Workers enhanced with real scraping support
2. ⏳ Test with real Instagram/TikTok accounts
3. ⏳ Add comment scraping
4. ⏳ Implement AI sentiment (IndoBERT)
5. ⏳ Add proxy support for rate limiting

---

**Status:** ✅ Workers ready for testing  
**Last Updated:** July 25, 2026  
**Version:** 1.1
