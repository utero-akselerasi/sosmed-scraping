# 🚀 Quick Setup Guide - Festival Mbois Intelligence Platform

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- **Docker** & Docker Compose
- **Git**

---

## 1. Clone Repository

```bash
git clone <repository-url>
cd scraping-project
```

---

## 2. Start Infrastructure (Database & Redis)

```bash
cd infrastructure/docker
docker-compose up -d
```

This will start:
- PostgreSQL on port 5432
- Redis on port 6379
- pgAdmin on port 5050
- Redis Commander on port 8081

**Database credentials:**
- Host: localhost
- Port: 5432
- Database: festival_mbois
- User: mbois_user
- Password: mbois_password_2026

**pgAdmin (Database UI):**
- URL: http://localhost:5050
- Email: admin@festivalmbois.com
- Password: admin123

---

## 3. Configure Environment

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your settings (optional, defaults are fine for development)
```

---

## 4. Setup Backend (NestJS)

```bash
cd backend

# Install dependencies
npm install

# Start development server
npm run start:dev
```

Backend will run on: http://localhost:4000
API Documentation: http://localhost:4000/api/v1/docs

---

## 5. Setup Workers (Python)

```bash
cd workers

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Download NLTK data
python -c "import nltk; nltk.download('stopwords')"

# Run a worker
python instagram/worker.py
```

---

## 6. Default Admin User

After database initialization, use this account to login:

- **Email:** admin@festivalmbois.com
- **Password:** admin123

⚠️ **Change this password in production!**

---

## 7. Verify Setup

### Check Database
```bash
docker exec -it mbois-postgres psql -U mbois_user -d festival_mbois -c "SELECT COUNT(*) FROM platforms;"
```

Should return 6 platforms.

### Check Backend API
```bash
curl http://localhost:4000/api/v1/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@festivalmbois.com","password":"admin123"}'
```

Should return JWT token.

### Check Workers
```bash
cd workers
python instagram/worker.py
```

Should connect to database and start processing.

---

## 8. Access Services

| Service | URL | Purpose |
|---------|-----|---------|
| Backend API | http://localhost:4000 | REST API |
| API Docs (Swagger) | http://localhost:4000/api/v1/docs | API Documentation |
| pgAdmin | http://localhost:5050 | Database Management |
| Redis Commander | http://localhost:8081 | Redis Management |

---

## 9. Development Workflow

### Backend Development
```bash
cd backend
npm run start:dev  # Watch mode with hot reload
npm run lint       # Check code style
npm run test       # Run tests
```

### Run Workers Manually
```bash
cd workers
source venv/bin/activate  # or venv\Scripts\activate on Windows
python instagram/worker.py
python tiktok/worker.py
python website/scraper.py
```

### View Logs
```bash
# Backend logs
cd backend
# Check console output

# Worker logs
cd workers
tail -f logs/instagram_worker.log
tail -f logs/tiktok_worker.log
tail -f logs/website_scraper.log
```

---

## 10. Stop Services

```bash
# Stop Docker services
cd infrastructure/docker
docker-compose down

# Stop backend (Ctrl+C in terminal)

# Deactivate Python venv
deactivate
```

---

## Troubleshooting

### Port Already in Use
If ports 4000, 5432, or 6379 are already in use:
1. Edit `.env` to change ports
2. Update `docker-compose.yml` accordingly

### Database Connection Failed
1. Check Docker is running: `docker ps`
2. Verify database container is up: `docker logs mbois-postgres`
3. Check credentials in `.env`

### Worker Can't Connect
1. Ensure backend and database are running
2. Check `.env` configuration
3. Verify virtual environment is activated

### npm install fails
1. Clear cache: `npm cache clean --force`
2. Delete `node_modules` and try again
3. Check Node.js version: `node --version` (should be 18+)

---

## Next Steps

1. ✅ Setup complete
2. 📖 Read `/docs` folder for detailed documentation
3. 🔧 Configure workers for your platforms
4. 🚀 Start collecting data
5. 📊 Build frontend dashboard (Week 2-3)

---

## Quick Reference

**Start Everything:**
```bash
# Terminal 1: Infrastructure
cd infrastructure/docker && docker-compose up

# Terminal 2: Backend
cd backend && npm run start:dev

# Terminal 3: Workers
cd workers && source venv/bin/activate && python instagram/worker.py
```

**Stop Everything:**
```bash
# Ctrl+C in all terminals
cd infrastructure/docker && docker-compose down
```

---

## Support

- 📖 Documentation: `/docs` folder
- 🐛 Issues: Create GitHub issue
- 💬 Questions: Contact development team

---

**Status:** ✅ Week 1 Foundation (Day 1) Complete  
**Next:** Users Module, Posts Module, Analytics Endpoints

**Created by:** Kharisman (maskhar.com)  
**Organization:** Utero Indonesia
