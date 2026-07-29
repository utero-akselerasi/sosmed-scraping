# Festival Mbois Intelligence Platform

## Project Structure

```
scraping-project/
├── backend/              # NestJS Backend API
├── frontend/            # Next.js Dashboard
├── workers/             # Python Workers (Instagram, TikTok, Website)
├── shared/              # Shared types & utilities
├── infrastructure/      # Docker, Database, CI/CD
└── docs/               # Documentation
```

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose

### Development Setup

1. **Clone & Install**
```bash
git clone <repository>
cd scraping-project
```

2. **Start Infrastructure**
```bash
cd infrastructure/docker
docker-compose up -d
```

3. **Setup Backend**
```bash
cd backend
npm install
npm run start:dev
```

4. **Setup Frontend**
```bash
cd frontend
npm install
npm run dev
```

5. **Setup Workers**
```bash
cd workers
pip install -r requirements.txt
python instagram/worker.py
```

## Timeline

- **Week 1 (Jul 24-31):** Backend Core + 2 Workers
- **Week 2 (Aug 1-7):** Frontend + Website Scraper
- **Week 3 (Aug 8-10):** Integration + Deploy (60-70% Ready)
- **Week 4 (Aug 11-20):** Final Polish
- **Aug 21-23:** Event Festival Mbois

## Team

- AI Developers (Full Development)
- 2 Interns (Starting Monday, Jul 28)
- Project Lead (Monitoring)

## Tech Stack

- **Backend:** NestJS, TypeScript, PostgreSQL, Redis
- **Frontend:** Next.js 14, React 18, TailwindCSS
- **Workers:** Python 3.11+, asyncio, aiohttp
- **Infrastructure:** Docker, Docker Compose

## Documentation

See `/docs` folder for complete documentation.

---

**Status:** 🚀 In Development  
**Target:** Aug 10, 2026 (60-70% Complete)  
**Event:** Aug 21-23, 2026
