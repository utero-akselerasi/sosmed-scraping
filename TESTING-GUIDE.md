# 🧪 Testing Guide - Festival Mbois Intelligence Platform

**Created:** 25 Juli 2026, 14:21 WIB  
**Status:** Ready for Testing Phase

---

## 📋 Prerequisites Checklist

Before starting testing, ensure you have:

- [x] PostgreSQL installed and running
- [x] Node.js v18+ installed
- [x] npm or yarn installed
- [x] Git repository cloned
- [ ] Database created and configured
- [ ] Environment variables set up
- [ ] Dependencies installed

---

## 🚀 Step-by-Step Testing Setup

### **Step 1: Database Setup**

#### 1.1 Create Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE festival_mbois_db;

# Create user (optional)
CREATE USER festival_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE festival_mbois_db TO festival_user;

# Exit psql
\q
```

#### 1.2 Configure Environment Variables
```bash
# Navigate to backend folder
cd backend

# Create .env file
cp .env.example .env

# Edit .env file with your settings
```

**Required Environment Variables:**
```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=festival_mbois_db

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=24h
JWT_REFRESH_EXPIRATION=7d

# Application
PORT=3000
NODE_ENV=development

# Security
BCRYPT_ROUNDS=10

# CORS
CORS_ORIGIN=http://localhost:3001
```

---

### **Step 2: Backend Setup & Testing**

#### 2.1 Install Dependencies
```bash
cd backend
npm install
```

#### 2.2 Run Database Migrations
```bash
npm run migration:run
```

#### 2.3 Seed Initial Data (Optional)
```bash
npm run seed
```

#### 2.4 Start Backend Server
```bash
# Development mode (with hot reload)
npm run start:dev

# Or production mode
npm run build
npm run start:prod
```

**Expected Output:**
```
[Nest] Application successfully started
[Nest] Listening on port 3000
[Nest] Database connected successfully
```

#### 2.5 Test Backend API

**Method 1: Using Swagger UI**
1. Open browser: http://localhost:3000/api
2. You'll see interactive API documentation
3. Test endpoints directly from Swagger UI

**Method 2: Using cURL**
```bash
# Health check
curl http://localhost:3000/

# Login to get token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin123"}'

# Expected response:
# {
#   "access_token": "eyJhbGc...",
#   "refresh_token": "eyJhbGc...",
#   "user": {...}
# }

# Test authenticated endpoint
curl http://localhost:3000/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Method 3: Using Postman**
1. Import Swagger JSON from http://localhost:3000/api-json
2. Create environment with `baseUrl` = http://localhost:3000
3. Test all endpoints

---

### **Step 3: Frontend Setup & Testing**

#### 3.1 Configure Environment Variables
```bash
cd frontend

# Create .env.local file
touch .env.local
```

**Add to .env.local:**
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

#### 3.2 Install Dependencies
```bash
npm install
```

#### 3.3 Start Frontend Development Server
```bash
npm run dev
```

**Expected Output:**
```
- ready started server on 0.0.0.0:3001
- Local:        http://localhost:3001
```

#### 3.4 Access Frontend
1. Open browser: http://localhost:3001
2. You should see the login page

---

### **Step 4: End-to-End Testing Flow**

#### 4.1 Test Authentication
1. Go to http://localhost:3001/login
2. Default credentials:
   - **Email:** admin@example.com
   - **Password:** admin123
3. Click "Login"
4. Should redirect to /dashboard

#### 4.2 Test Dashboard Overview
1. Check if stats cards show data
2. Check if charts render properly
3. Test dark mode toggle (top-right)
4. Test auto-refresh toggle

#### 4.3 Test Posts Management
1. Navigate to "Posts" from sidebar
2. Test filters:
   - Search by content/author
   - Filter by sentiment (Positive/Neutral/Negative)
   - Filter by platform
3. Test **Filter Presets** (NEW!):
   - Set some filters
   - Click "Filter Presets" button
   - Click "Save Current Filters"
   - Enter name: "High Engagement Posts"
   - Click "Save"
   - Clear filters
   - Load the saved preset
4. Test **Date Range Picker** (NEW!):
   - Click "Date Range" button
   - Try quick presets (Today, Last 7 days, etc.)
   - Try custom date range
   - Click "Apply"
5. Test export:
   - Click "Export" dropdown
   - Export as CSV
   - Export as JSON
6. Click on a post to see detail modal

#### 4.4 Test Influencers
1. Navigate to "Influencers"
2. Check top 5 influencer cards (gradient section)
3. Click on any influencer card
4. **Test Influencer Detail Page** (NEW!):
   - Check profile information
   - Check 4 stats cards
   - Check sentiment distribution
   - Check **Engagement Over Time chart** (real data!)
   - Check **Content Type Distribution chart** (real data!)
5. Test back button

#### 4.5 Test Analytics
1. Navigate to "Analytics"
2. Check all visualizations:
   - Sentiment pie chart
   - Platform sentiment bar chart
   - Posts & engagement trend line chart
   - Top hashtags word cloud
   - Top engaging posts list
3. Test export for each section

#### 4.6 Test Profile Management (NEW!)
1. Scroll to bottom of sidebar
2. Click "Profile" button
3. **Test Edit Profile:**
   - Click "Edit Profile"
   - Change full name
   - Change email
   - Click "Save Changes"
   - Page should reload with updated info
4. **Test Change Password:**
   - Click "Change Password"
   - Enter current password
   - Enter new password
   - Confirm new password
   - Click "Update Password"
   - Success toast should appear

#### 4.7 Test Admin Features (if you're admin)
1. Navigate to "Admin"
2. Check system stats
3. Check platform status
4. Navigate to "Users"
5. Test create/edit/delete user
6. Test toggle user active status
7. Navigate to "Keywords"
8. Test create/edit/delete keyword
9. Test toggle keyword active

---

## 🔍 What to Look For During Testing

### **Functionality Tests**
- [ ] All pages load without errors
- [ ] All buttons work as expected
- [ ] All forms submit successfully
- [ ] All charts render properly
- [ ] All exports work (CSV, JSON, PDF)
- [ ] Filter presets save/load correctly
- [ ] Date range filtering works
- [ ] Real-time auto-refresh works
- [ ] Dark mode works on all pages
- [ ] Mobile responsive works

### **Data Tests**
- [ ] Dashboard stats show correct numbers
- [ ] Posts list shows data
- [ ] Influencers list shows data
- [ ] Analytics charts show data
- [ ] Engagement charts show real data (not mock)
- [ ] Content type charts show real data
- [ ] Sentiment analysis is accurate

### **UI/UX Tests**
- [ ] Loading states show when fetching data
- [ ] Empty states show when no data
- [ ] Error messages are clear
- [ ] Toast notifications appear
- [ ] Forms have proper validation
- [ ] Buttons have hover effects
- [ ] Dark mode has proper contrast
- [ ] Mobile layout is usable

### **Performance Tests**
- [ ] Pages load quickly (< 3 seconds)
- [ ] Charts render smoothly
- [ ] No console errors
- [ ] No memory leaks
- [ ] Pagination works smoothly

---

## 🐛 Common Issues & Solutions

### **Issue 1: Database Connection Failed**
**Error:** "Unable to connect to the database"

**Solution:**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL if not running
sudo systemctl start postgresql

# Verify connection
psql -U postgres -d festival_mbois_db
```

### **Issue 2: Port Already in Use**
**Error:** "Port 3000 is already in use"

**Solution:**
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (Windows)
taskkill /PID <PID> /F

# Or change port in .env
PORT=3001
```

### **Issue 3: CORS Error**
**Error:** "Access blocked by CORS policy"

**Solution:**
```bash
# Update backend .env
CORS_ORIGIN=http://localhost:3001

# Restart backend server
```

### **Issue 4: JWT Token Invalid**
**Error:** "Invalid token" or "Token expired"

**Solution:**
1. Logout and login again
2. Clear browser localStorage
3. Check if JWT_SECRET matches in backend .env

### **Issue 5: No Data Showing**
**Reason:** Database is empty — content is only created by the scraping workers

**Solution:**
```bash
# Ensure schema is applied and run the canonical seed (admin, platforms, keywords)
cd backend
npm run seed

# Then run the workers to collect real data:
cd ../workers
python run_all.py
```

---

## 📊 Testing Checklist

### **Backend API Testing**
- [ ] POST /auth/login
- [ ] POST /auth/refresh
- [ ] GET /users/profile ⭐ NEW
- [ ] PATCH /users/profile ⭐ NEW
- [ ] PATCH /users/profile/password ⭐ NEW
- [ ] GET /posts (with date range)
- [ ] GET /posts/stats
- [ ] GET /influencers
- [ ] GET /influencers/:id
- [ ] GET /influencers/:id/engagement ⭐ NEW
- [ ] GET /influencers/:id/content-types ⭐ NEW
- [ ] GET /analytics/dashboard-overview
- [ ] GET /analytics/sentiment
- [ ] GET /analytics/engagement
- [ ] GET /analytics/trends
- [ ] GET /analytics/hashtags

### **Frontend Features Testing**
- [ ] Login/Logout
- [ ] Dark mode toggle
- [ ] Dashboard overview
- [ ] Posts list with filters
- [ ] Filter presets (save/load/delete) ⭐ NEW
- [ ] Date range picker ⭐ NEW
- [ ] Post detail modal
- [ ] Influencers list
- [ ] Influencer detail page ⭐ NEW (with real data)
- [ ] Analytics visualizations
- [ ] Profile edit ⭐ NEW
- [ ] Password change ⭐ NEW
- [ ] Export CSV/JSON/PDF
- [ ] Auto-refresh toggle
- [ ] Mobile responsive

---

## 🚀 Next: Running Workers (Optional)

If you want to test data collection:

### **Step 5: Workers Setup**

#### 5.1 Configure Workers
```bash
cd workers

# Create .env file
cp .env.example .env
```

#### 5.2 Install Dependencies
```bash
npm install
```

#### 5.3 Run Individual Workers
```bash
# Instagram scraper
npm run start:instagram

# TikTok scraper
npm run start:tiktok

# Website scraper
npm run start:website

# Sentiment analyzer
npm run start:sentiment

# Or run all workers
npm run start:all
```

**Note:** Workers will:
- Fetch data from social media platforms
- Store posts in database
- Analyze sentiment
- Update engagement metrics

---

## 📝 Testing Report Template

After testing, create a report:

```markdown
# Testing Report - [Date]

## Environment
- Backend: Running ✅ / Failed ❌
- Frontend: Running ✅ / Failed ❌
- Database: Connected ✅ / Failed ❌

## Features Tested
1. Authentication: ✅ PASSED
2. Dashboard: ✅ PASSED
3. Posts Management: ✅ PASSED
4. Filter Presets: ✅ PASSED
5. Date Range Picker: ✅ PASSED
6. Influencers List: ✅ PASSED
7. Influencer Detail: ✅ PASSED
8. Profile Management: ✅ PASSED
9. Analytics: ✅ PASSED
10. Export: ✅ PASSED

## Issues Found
1. [Description of issue]
   - Severity: High/Medium/Low
   - Steps to reproduce: ...
   - Expected behavior: ...
   - Actual behavior: ...

## Performance
- Average page load: X seconds
- API response time: X ms
- Chart render time: X ms

## Recommendations
- [Any suggestions for improvements]

## Conclusion
Overall Status: ✅ READY FOR PRODUCTION / ⚠️ NEEDS FIXES
```

---

## 🎯 Testing Priorities

### **Priority 1: Critical (Must Work)**
1. Authentication (Login/Logout)
2. Backend API connectivity
3. Database connection
4. Dashboard loading

### **Priority 2: High (Core Features)**
1. Posts management & filtering
2. Influencers list & detail
3. Analytics visualizations
4. Profile management
5. Date range filtering

### **Priority 3: Medium (Enhanced Features)**
1. Filter presets
2. Export functionality
3. Dark mode
4. Auto-refresh
5. Mobile responsive

### **Priority 4: Low (Nice to Have)**
1. Animations
2. Tooltips
3. Loading indicators
4. Empty states

---

## ✅ Ready to Test?

**Quick Start Commands:**

```bash
# Terminal 1: Start Backend
cd backend
npm run start:dev

# Terminal 2: Start Frontend
cd frontend
npm run dev

# Terminal 3: Start Database (if not running)
sudo systemctl start postgresql
```

**Then open:** http://localhost:3001

---

**Good luck with testing! 🚀**

If you encounter any issues, refer to the troubleshooting section above or check the logs.
