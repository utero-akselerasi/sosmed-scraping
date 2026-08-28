# API Documentation - Festival Mbois Intelligence Platform

## Base URL
```
http://localhost:4000/api/v1
```

## Authentication
All endpoints (except auth) require JWT Bearer token:
```
Authorization: Bearer <your_jwt_token>
```

---

## 📚 API Endpoints

### 🔐 Authentication (`/auth`)

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "fullName": "John Doe",
  "password": "password123"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@festivalmbois.com",
  "password": "admin123"
}

Response:
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "admin@festivalmbois.com",
    "fullName": "Administrator",
    "role": "admin"
  }
}
```

#### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

#### Get Profile
```http
GET /auth/me
Authorization: Bearer <token>
```

---

### 📝 Posts (`/posts`)

#### Get All Posts (with filters)
```http
GET /posts?page=1&limit=20&platformId=uuid&sentiment=positive&search=festival&hashtag=mbois&startDate=2026-07-01&endDate=2026-07-31&sortBy=engagement_score&sortOrder=DESC
Authorization: Bearer <token>

Response:
{
  "data": [
    {
      "id": "uuid",
      "platformName": "Instagram",
      "platformType": "instagram",
      "influencerUsername": "user123",
      "influencerName": "John Doe",
      "content": "Post content...",
      "likesCount": 100,
      "commentsCount": 20,
      "engagementScore": 340.5,
      "sentiment": "positive",
      "hashtags": ["#festivalmbois", "#mbois"],
      "postedAt": "2026-07-24T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

#### Get Post by ID
```http
GET /posts/:id
Authorization: Bearer <token>
```

#### Get Posts Statistics
```http
GET /posts/stats?platformId=uuid&startDate=2026-07-01
Authorization: Bearer <token>

Response:
{
  "totalPosts": 1500,
  "totalLikes": 50000,
  "totalComments": 8000,
  "totalShares": 2000,
  "totalViews": 200000,
  "avgEngagementScore": 125.5,
  "sentimentDistribution": {
    "positive": 850,
    "neutral": 500,
    "negative": 150
  }
}
```

#### Get Top Hashtags
```http
GET /posts/top-hashtags?limit=10
Authorization: Bearer <token>

Response:
[
  {
    "hashtag": "#festivalmbois",
    "count": 450
  },
  {
    "hashtag": "#mbois",
    "count": 380
  }
]
```

#### Get Trending Posts (24h)
```http
GET /posts/trending?limit=10
Authorization: Bearer <token>
```

---

### 🌐 Platforms (`/platforms`)

#### Get All Platforms
```http
GET /platforms
Authorization: Bearer <token>

Response:
[
  {
    "id": "uuid",
    "name": "Instagram",
    "type": "instagram",
    "isActive": true,
    "config": {},
    "createdAt": "2026-07-24T00:00:00Z"
  }
]
```

#### Get Platform Overview
```http
GET /platforms/overview
Authorization: Bearer <token>

Response:
{
  "totalPlatforms": 6,
  "activePlatforms": 5,
  "totalPosts": 5000,
  "totalInfluencers": 250,
  "platformStats": [...]
}
```

#### Get Platform by ID
```http
GET /platforms/:id
Authorization: Bearer <token>
```

#### Get Platform Statistics
```http
GET /platforms/:id/stats
Authorization: Bearer <token>

Response:
{
  "platformId": "uuid",
  "platformName": "Instagram",
  "platformType": "instagram",
  "totalPosts": 2000,
  "totalInfluencers": 120,
  "totalLikes": 45000,
  "avgEngagementScore": 150.5,
  "sentimentDistribution": {
    "positive": 1200,
    "neutral": 600,
    "negative": 200
  },
  "lastScrapedAt": "2026-07-24T16:00:00Z"
}
```

#### Toggle Platform Status (Admin only)
```http
PATCH /platforms/:id/toggle
Authorization: Bearer <token>
```

---

### 👥 Influencers (`/influencers`)

#### Get All Influencers (with filters)
```http
GET /influencers?page=1&limit=20&platformId=uuid&search=username&sortBy=engagement_rate&sortOrder=DESC
Authorization: Bearer <token>

Response:
{
  "data": [
    {
      "id": "uuid",
      "platformName": "Instagram",
      "username": "influencer123",
      "fullName": "Jane Smith",
      "followersCount": 50000,
      "engagementRate": 5.5,
      "isVerified": true
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 250,
    "totalPages": 13
  }
}
```

#### Get Influencer Details by ID
```http
GET /influencers/:id
Authorization: Bearer <token>

Response:
{
  "id": "uuid",
  "username": "influencer123",
  "fullName": "Jane Smith",
  "followersCount": 50000,
  "engagementRate": 5.5,
  "totalPosts": 150,
  "totalLikes": 25000,
  "avgEngagementScore": 180.5,
  "sentimentDistribution": {
    "positive": 100,
    "neutral": 40,
    "negative": 10
  }
}
```

#### Get Top Influencers
```http
GET /influencers/top?limit=10
Authorization: Bearer <token>
```

#### Get Top Influencers by Platform
```http
GET /influencers/platform/:platformId/top?limit=10
Authorization: Bearer <token>
```

---

### 👤 Users (`/users`)

#### Get Current User Profile
```http
GET /users/profile
Authorization: Bearer <token>

Response:
{
  "id": "uuid",
  "email": "user@example.com",
  "fullName": "John Doe",
  "role": "admin",
  "isActive": true,
  "lastLogin": "2026-08-20T10:00:00Z",
  "createdAt": "2026-08-01T00:00:00Z",
  "updatedAt": "2026-08-20T10:00:00Z"
}
```

#### Update Current User Profile
```http
PATCH /users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "fullName": "New Name",
  "email": "newemail@example.com"
}
```

#### Change Current User Password
```http
PATCH /users/profile/password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

#### Create New User (Admin only)
```http
POST /users
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "newuser@example.com",
  "fullName": "New User",
  "password": "password123",
  "role": "viewer"
}
```

#### Get All Users (Admin/Analyst)
```http
GET /users?page=1&limit=20&role=admin&isActive=true&search=john
Authorization: Bearer <token>

Response:
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "role": "admin",
      "isActive": true,
      "lastLogin": "2026-08-20T10:00:00Z",
      "createdAt": "2026-08-01T00:00:00Z",
      "updatedAt": "2026-08-20T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

#### Get User by ID (Admin/Analyst)
```http
GET /users/:id
Authorization: Bearer <token>
```

#### Update User (Admin only)
```http
PATCH /users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "fullName": "Updated Name",
  "email": "updated@example.com",
  "role": "analyst",
  "isActive": true
}
```

#### Change User Password (Self or Admin)
```http
PATCH /users/:id/password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

#### Toggle User Active Status (Admin only)
```http
PATCH /users/:id/toggle
Authorization: Bearer <token>

Response: Updated user object with toggled isActive status
```

#### Delete User (Admin only)
```http
DELETE /users/:id
Authorization: Bearer <token>
```
- `403` - Cannot delete your own account

---

### 📊 Analytics (`/analytics`)

#### Get Dashboard Overview
```http
GET /analytics/dashboard?startDate=2026-07-01&endDate=2026-07-31
Authorization: Bearer <token>

Response:
{
  "totalPosts": 5000,
  "totalInfluencers": 250,
  "totalPlatforms": 6,
  "totalEngagement": 250000,
  "avgEngagementScore": 125.5,
  "sentimentDistribution": {
    "positive": 3000,
    "neutral": 1500,
    "negative": 500,
    "positivePercentage": 60,
    "neutralPercentage": 30,
    "negativePercentage": 10
  },
  "topPlatform": {
    "name": "Instagram",
    "postsCount": 2500
  },
  "recentActivity": {
    "last24Hours": 150,
    "last7Days": 800,
    "last30Days": 3000
  }
}
```

#### Get Trend Analytics
```http
GET /analytics/trends
Authorization: Bearer <token>

Response:
{
  "dailyPosts": [
    {
      "date": "2026-07-24",
      "count": 150,
      "engagement": 125.5
    }
  ],
  "hourlyPosts": [
    {
      "date": "2026-07-24T10:00:00Z",
      "count": 8,
      "engagement": 130.2
    }
  ],
  "growthRate": {
    "daily": 0,
    "weekly": 15.5,
    "monthly": 0
  }
}
```

#### Get Top Hashtags (Analytics)
```http
GET /analytics/top-hashtags?limit=20
Authorization: Bearer <token>
```

#### Get Sentiment Analytics
```http
GET /analytics/sentiment
Authorization: Bearer <token>

Response:
{
  "overall": {
    "positive": 3000,
    "neutral": 1500,
    "negative": 500
  },
  "byPlatform": [
    {
      "platformName": "Instagram",
      "positive": 1500,
      "neutral": 700,
      "negative": 300
    }
  ],
  "trend": [
    {
      "date": "2026-07-24",
      "positive": 90,
      "neutral": 40,
      "negative": 20
    }
  ]
}
```

#### Get Engagement Analytics
```http
GET /analytics/engagement
Authorization: Bearer <token>

Response:
{
  "totalLikes": 50000,
  "totalComments": 8000,
  "totalShares": 2000,
  "totalViews": 200000,
  "avgLikesPerPost": 33.3,
  "avgCommentsPerPost": 5.3,
  "avgSharesPerPost": 1.3,
  "topEngagingPosts": [...]
}
```

---

### 🕷️ Scraping (`/scraping`)

#### Trigger Manual Scraping (Website Scraper)
```http
POST /scraping/run
Authorization: Bearer <token>

Response (202):
{
  "message": "Scraping dimulai.",
  "accepted": true
}
```
- `409` - Masih ada proses scraping yang sedang berjalan (busy)

#### Trigger Manual Scraping Threads (terisolasi)
```http
POST /scraping/run/threads
Authorization: Bearer <token>

Response (202):
{
  "message": "Scraping Threads dimulai.",
  "accepted": true
}
```
- `400` - Threads worker disabled (`THREADS_ENABLED=false`)
- `409` - Masih ada proses scraping yang sedang berjalan (busy)
- Hanya menjalankan `workers/threads/worker.py`; tidak menyentuh worker lain.
- Dijadwalkan otomatis tiap 6 jam via `@Cron` (`0 0 */6 * * *`) jika
  `THREADS_ENABLED=true`.

#### Get Scraping Status
```http
GET /scraping/status
Authorization: Bearer <token>

Response:
{
  "busy": false,
  "jobs": [
    {
      "id": "uuid",
      "platformId": "uuid",
      "platformName": "Threads",
      "platformType": "threads",
      "status": "completed",
      "startedAt": "2026-07-24T10:00:00Z",
      "completedAt": "2026-07-24T10:05:00Z",
      "durationSeconds": 300,
      "postsInDatabase": 42,
      "postsCollected": 45,
      "errorsCount": 3,
      "errorMessage": null
    }
  ]
}
```
- Job terbaru per platform; `postsInDatabase` = jumlah post asli di tabel `posts`.

---

## 📋 Query Parameters

### Posts Filters
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `platformId` - Filter by platform UUID
- `influencerId` - Filter by influencer UUID
- `postType` - Filter by type: post, reel, story, video, article
- `sentiment` - Filter by: positive, neutral, negative
- `search` - Search in content
- `hashtag` - Filter by hashtag (with or without #)
- `startDate` - Start date (ISO 8601)
- `endDate` - End date (ISO 8601)
- `sortBy` - Sort field: posted_at, engagement_score, likes_count, comments_count
- `sortOrder` - ASC or DESC

### Influencers Filters
- `page` - Page number
- `limit` - Items per page
- `platformId` - Filter by platform
- `search` - Search username or name
- `sortBy` - followers_count, engagement_rate, posts_count
- `sortOrder` - ASC or DESC

---

## 🔒 Role-Based Access

### Admin
- Full access to all endpoints
- Can toggle platform status

### Analyst
- Read access to all data
- Cannot modify platform settings

### Viewer
- Read-only access to posts and analytics

---

## 📝 Response Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate email)
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

---

## 🚀 Swagger Documentation

Interactive API documentation available at:
```
http://localhost:4000/api/v1/docs
```

---

## 📊 Total Endpoints: 40

### By Module:
- Authentication: 4 endpoints
- Users: 10 endpoints
- Posts: 5 endpoints
- Platforms: 5 endpoints
- Influencers: 4 endpoints
- Analytics: 5 endpoints
- Scraping: 3 endpoints

---

**Last Updated:** August 11, 2026  
**API Version:** 1.0  
**Status:** Ready for Testing
