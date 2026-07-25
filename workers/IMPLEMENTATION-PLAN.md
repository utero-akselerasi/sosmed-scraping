# 🚀 Workers Full Implementation Plan

**Status:** Option C - Full Implementation  
**Target:** 100% Working Scraping System  
**Timeline:** 18-23 hours (2-3 hari kerja)

---

## 📋 Implementation Checklist

### **Phase 1: Instagram Worker (6 hours)** 🔷

#### **1.1 Core Enhancement (2 hours)**
- [x] Basic structure exists
- [ ] Add login with credentials (optional, anonymous also works)
- [ ] Add session persistence
- [ ] Add retry logic with exponential backoff
- [ ] Add better error handling for rate limits
- [ ] Add progress tracking

#### **1.2 Advanced Features (2 hours)**
- [ ] Add story scraping
- [ ] Add reel detection and special handling
- [ ] Add comment scraping (top comments)
- [ ] Add user profile enrichment
- [ ] Add carousel/album post support

#### **1.3 Rate Limiting & Proxies (2 hours)**
- [ ] Implement intelligent rate limiting
- [ ] Add proxy rotation support
- [ ] Add request delay randomization
- [ ] Add retry on 429 (Too Many Requests)
- [ ] Add IP rotation if proxies available

**Files to Modify:**
- `workers/instagram/worker.py`
- `workers/shared/proxy_manager.py` (NEW)

---

### **Phase 2: TikTok Worker (6 hours)** 🔷

#### **2.1 Core Implementation (3 hours)**
- [x] Basic structure exists
- [ ] Implement TikTokApi integration
- [ ] Add hashtag search
- [ ] Add video data extraction
- [ ] Add user profile extraction
- [ ] Add engagement metrics extraction

#### **2.2 Advanced Features (2 hours)**
- [ ] Add sound/music tracking
- [ ] Add trending video detection
- [ ] Add comment scraping
- [ ] Add challenge/trend detection
- [ ] Add video download (optional)

#### **2.3 Optimization (1 hour)**
- [ ] Add rate limiting
- [ ] Add proxy support
- [ ] Add error handling
- [ ] Add progress tracking

**Files to Modify:**
- `workers/tiktok/worker.py`

---

### **Phase 3: Website Scraper Enhancement (3 hours)** 🔷

#### **3.1 Core Enhancement (1.5 hours)**
- [x] Basic scraping exists
- [ ] Add readability support (better content extraction)
- [ ] Add support for more news sites
- [ ] Add RSS feed support
- [ ] Add sitemap parsing

#### **3.2 Content Processing (1 hour)**
- [ ] Add image extraction and CDN upload
- [ ] Add video detection
- [ ] Add author extraction
- [ ] Add category/tag extraction
- [ ] Add publish date normalization

#### **3.3 Site-Specific Scrapers (0.5 hour)**
- [ ] Add scraper for Detik.com
- [ ] Add scraper for Kompas.com
- [ ] Add scraper for Tribunnews.com
- [ ] Add generic fallback

**Files to Modify:**
- `workers/website/scraper.py`
- `workers/website/sites/` (NEW directory with site-specific scrapers)

---

### **Phase 4: Proxy Support (2 hours)** 🔷

#### **4.1 Proxy Manager (1.5 hours)**
- [ ] Create ProxyManager class
- [ ] Add proxy list loading (from file/env)
- [ ] Add proxy rotation logic
- [ ] Add proxy health check
- [ ] Add dead proxy removal

#### **4.2 Integration (0.5 hour)**
- [ ] Integrate with Instagram worker
- [ ] Integrate with TikTok worker
- [ ] Integrate with Website scraper
- [ ] Add configuration options

**Files to Create:**
- `workers/shared/proxy_manager.py`
- `workers/proxies.txt` (example proxy list)

---

### **Phase 5: AI Sentiment Analysis (4 hours)** 🔷

#### **5.1 IndoBERT Setup (2 hours)**
- [ ] Install transformers library
- [ ] Download IndoBERT model
- [ ] Create IndoBERT analyzer class
- [ ] Add model caching
- [ ] Add GPU support if available

#### **5.2 Hybrid Sentiment (1 hour)**
- [ ] Combine rule-based + AI
- [ ] Use rule-based for quick filtering
- [ ] Use AI for complex/ambiguous text
- [ ] Add confidence scores
- [ ] Add multilingual support

#### **5.3 Integration (1 hour)**
- [ ] Update shared/sentiment.py
- [ ] Add fallback to rule-based if AI fails
- [ ] Add performance monitoring
- [ ] Add batch processing for efficiency

**Files to Modify:**
- `workers/shared/sentiment.py`
- `workers/shared/sentiment_ai.py` (NEW)

---

### **Phase 6: Testing & Documentation (2 hours)** 🔷

#### **6.1 Unit Tests (1 hour)**
- [ ] Test Instagram scraping
- [ ] Test TikTok scraping
- [ ] Test Website scraping
- [ ] Test sentiment analysis
- [ ] Test proxy rotation

#### **6.2 Integration Tests (0.5 hour)**
- [ ] Test end-to-end flow
- [ ] Test database integration
- [ ] Test error handling
- [ ] Test rate limiting

#### **6.3 Documentation (0.5 hour)**
- [ ] Update README.md
- [ ] Add setup guide
- [ ] Add configuration guide
- [ ] Add troubleshooting guide

---

## 🎯 Quick Wins (High Priority)

**If time is limited, focus on these:**

### **Priority 1: Make Instagram Work (4 hours)** ⚡
1. Add proper login/session (1 hour)
2. Fix rate limiting issues (1 hour)
3. Add retry logic (1 hour)
4. Test with real data (1 hour)

### **Priority 2: Make TikTok Work (4 hours)** ⚡
1. Integrate TikTokApi properly (2 hours)
2. Add hashtag search (1 hour)
3. Test with real data (1 hour)

### **Priority 3: Enhance Website Scraper (2 hours)** ⚡
1. Add readability support (1 hour)
2. Add more news sites (1 hour)

**Total Quick Win Time:** 10 hours

---

## 📦 Dependencies to Install

```bash
cd workers

# Activate virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# OR
venv\Scripts\activate  # Windows

# Install all dependencies
pip install -r requirements.txt

# Install additional dependencies for enhancements
pip install newspaper3k  # Better article extraction
pip install requests[socks]  # Proxy support
pip install fake-useragent  # Random user agents
pip install transformers torch  # For AI sentiment (optional, large)
pip install python-telegram-bot  # For notifications (optional)

# Download NLTK data
python -m nltk.downloader stopwords punkt wordnet

# Install Playwright browsers (for TikTok)
playwright install chromium
```

---

## 🔧 Configuration

**Create `.env` file in `workers/` directory:**

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=festival_mbois_db
DB_USER=postgres
DB_PASSWORD=your_password

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# Instagram Settings
INSTAGRAM_ENABLED=true
INSTAGRAM_USERNAME=your_instagram_username  # Optional
INSTAGRAM_PASSWORD=your_instagram_password  # Optional
INSTAGRAM_MAX_POSTS=50
INSTAGRAM_SESSION_FILE=./instagram_session

# TikTok Settings
TIKTOK_ENABLED=true
TIKTOK_MAX_VIDEOS=50
TIKTOK_MS_TOKEN=your_ms_token  # Optional

# Website Settings
WEBSITE_ENABLED=true
WEBSITE_URLS=https://detik.com,https://kompas.com,https://tribunnews.com
WEBSITE_MAX_ARTICLES=30

# Worker Settings
WORKER_INTERVAL=900  # 15 minutes in seconds
MAX_RETRIES=3
RETRY_DELAY=5  # seconds
REQUEST_TIMEOUT=30  # seconds

# Proxy Settings (optional)
USE_PROXIES=false
PROXY_FILE=./proxies.txt
PROXY_ROTATION=true

# AI Sentiment (optional)
USE_AI_SENTIMENT=false
INDOBERT_MODEL=indobenchmark/indobert-base-p1
SENTIMENT_CONFIDENCE_THRESHOLD=0.7

# Notifications (optional)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
NOTIFY_ON_ERROR=true
NOTIFY_ON_COMPLETION=true
```

---

## 🚀 Quick Start Commands

```bash
# 1. Setup environment
cd workers
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env with your settings

# 4. Test individual workers
python instagram/worker.py  # Test Instagram
python tiktok/worker.py     # Test TikTok
python website/scraper.py   # Test Website

# 5. Run all workers
python run_all.py
```

---

## 📊 Expected Output

**After successful run:**

```
Instagram Worker:
✓ Collected 45 posts for hashtag #festivalmb ois
✓ Collected 38 posts for keyword festival
✓ Total: 83 posts, 2 influencers

TikTok Worker:
✓ Collected 42 videos for hashtag #festivalmb ois
✓ Total: 42 videos, 5 creators

Website Scraper:
✓ Scraped 15 articles from detik.com
✓ Scraped 12 articles from kompas.com
✓ Total: 27 articles

Overall:
✓ Total posts collected: 152
✓ Total influencers: 7
✓ Errors: 0
✓ Time: 5m 23s
```

---

## 🎯 Success Criteria

- [ ] Instagram worker can scrape at least 50 posts per keyword
- [ ] TikTok worker can scrape at least 50 videos per keyword
- [ ] Website scraper can scrape from at least 3 news sites
- [ ] All data properly saved to database
- [ ] Sentiment analysis working for Indonesian text
- [ ] No crashes or unhandled exceptions
- [ ] Rate limiting working (no IP bans)
- [ ] Workers can run continuously without issues

---

## 🐛 Known Issues & Solutions

**Issue:** Instagram rate limiting  
**Solution:** Use authenticated session, add delays, use proxies

**Issue:** TikTok API changes frequently  
**Solution:** Keep TikTokApi library updated, use playwright fallback

**Issue:** Website content extraction incomplete  
**Solution:** Use newspaper3k or readability libraries

**Issue:** Sentiment analysis not accurate for Indonesian  
**Solution:** Use IndoBERT or fine-tuned model

---

## 📞 Support

If you encounter issues:
1. Check logs in `workers/logs/`
2. Verify .env configuration
3. Check database connectivity
4. Check internet connection
5. Try with smaller MAX_POSTS/MAX_VIDEOS first

---

**Ready to implement Option C!** 🚀

**Estimated completion:** 2-3 days of focused work  
**Current progress:** 80% (infrastructure ready)  
**Remaining:** 20% (implementation & testing)
