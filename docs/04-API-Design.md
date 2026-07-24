# API Design Document
# Festival Mbois Intelligence Platform

**Version:** 1.0  
**Date:** July 23, 2026  
**Status:** Draft for Approval

---

## 1. API OVERVIEW

### 1.1 Purpose
This document specifies the RESTful API and WebSocket endpoints for the Festival Mbois Intelligence Platform, including authentication, request/response formats, error handling, and rate limiting.

### 1.2 API Design Principles
- **RESTful:** Resource-based URLs, HTTP methods
- **Consistent:** Uniform response format across all endpoints
- **Versioned:** API versioning in URL path
- **Secure:** JWT authentication, HTTPS only
- **Documented:** OpenAPI/Swagger specification
- **Performant:** Pagination, caching, rate limiting

### 1.3 Base URL

**Development:** http://localhost:3000/api/v1  
**Staging:** https://staging-api.festivalmbois.com/api/v1  
**Production:** https://api.festivalmbois.com/api/v1

### 1.4 API Versioning

**Strategy:** URL path versioning (e.g., /api/v1/, /api/v2/)

**Rationale:**
- Clear version visibility
- Easy routing and deprecation
- Backward compatibility support

---

## 2. AUTHENTICATION & AUTHORIZATION

### 2.1 Authentication Method

**JWT (JSON Web Token)** with Bearer scheme

**Token Lifetime:**
- Access Token: 24 hours
- Refresh Token: 7 days

### 2.2 Authentication Flow


`
1. Client sends credentials to /auth/login
   │
   ▼
2. Server validates credentials
   │
   ├─ Invalid: Return 401 Unauthorized
   │
   └─ Valid:
      │
      ▼
   3. Generate access_token + refresh_token
      │
      ▼
   4. Return tokens to client
      │
      ▼
   5. Client stores tokens (localStorage/secure storage)
      │
      ▼
   6. Client includes access_token in Authorization header
      │
      ▼
   7. Server validates token on each request
      │
      ├─ Expired: Return 401 (client refreshes)
      │
      └─ Valid: Process request
`

### 2.3 Authorization Header

`
Authorization: Bearer <access_token>
`

**Example:**
`
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
`

### 2.4 Role-Based Access Control (RBAC)

| Role | Permissions |
|------|-------------|
| **Admin** | Full access: CRUD users, view all data, export, manage keywords |
| **Analyst** | Read access: view all data, export reports, no user management |
| **Viewer** | Read-only access: view dashboard, no exports, no user management |

### 2.5 Token Payload

`json
{
  "sub": "user_uuid",
  "email": "user@example.com",
  "role": "analyst",
  "iat": 1721761200,
  "exp": 1721847600
}
`

---

## 3. REQUEST & RESPONSE FORMAT

### 3.1 Request Headers

**Required:**
`
Content-Type: application/json
Authorization: Bearer <token>
`

**Optional:**
`
Accept-Language: id-ID
X-Request-ID: <uuid>
`

### 3.2 Response Format

**Success Response:**
`json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-07-23T10:00:00Z",
    "requestId": "uuid"
  }
}
`

**Paginated Response:**
`json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "timestamp": "2026-07-23T10:00:00Z",
    "requestId": "uuid"
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
`

**Error Response:**
`json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-07-23T10:00:00Z",
    "requestId": "uuid"
  }
}
`

### 3.3 HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid request format/parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily down |

### 3.4 Error Codes

| Code | Description |
|------|-------------|
| VALIDATION_ERROR | Request validation failed |
| AUTHENTICATION_ERROR | Invalid credentials |
| AUTHORIZATION_ERROR | Insufficient permissions |
| NOT_FOUND | Resource not found |
| CONFLICT | Resource conflict (duplicate) |
| RATE_LIMIT_EXCEEDED | Too many requests |
| INTERNAL_ERROR | Server error |
| SERVICE_UNAVAILABLE | Service temporarily down |

---

## 4. PAGINATION

### 4.1 Query Parameters

`
?page=1&limit=20&sort=created_at&order=desc
`

**Parameters:**
- page (integer, default: 1): Page number
- limit (integer, default: 20, max: 100): Items per page
- sort (string): Sort field
- order (enum: asc, desc, default: desc): Sort order

### 4.2 Example Request

`http
GET /api/v1/posts?page=2&limit=50&sort=engagement_score&order=desc
`

### 4.3 Response

`json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 2,
    "limit": 50,
    "total": 500,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": true
  }
}
`

---

## 5. FILTERING & SEARCH

### 5.1 Filter Parameters

**Date Range:**
`
?startDate=2026-07-01&endDate=2026-07-31
`

**Platform Filter:**
`
?platform=instagram
`

**Sentiment Filter:**
`
?sentiment=positive
`

**Multiple Filters:**
`
?startDate=2026-07-01&platform=instagram&sentiment=positive
`

### 5.2 Search

**Text Search:**
`
?q=festival+mbois
`

**Full Example:**
`
GET /api/v1/posts?q=festival&platform=instagram&sentiment=positive&startDate=2026-07-01&page=1&limit=20
`

---

## 6. RATE LIMITING

### 6.1 Rate Limits

| User Type | Limit | Window |
|-----------|-------|--------|
| Anonymous | 20 requests | 1 minute |
| Authenticated (Viewer) | 100 requests | 1 minute |
| Authenticated (Analyst) | 100 requests | 1 minute |
| Authenticated (Admin) | 200 requests | 1 minute |

### 6.2 Rate Limit Headers

**Response Headers:**
`
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1721761260
`

### 6.3 Rate Limit Exceeded Response

`json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 60
  }
}
`

**HTTP Status:** 429 Too Many Requests

---

## 7. API ENDPOINTS

### 7.1 Authentication Endpoints

#### POST /auth/register
**Description:** Register a new user (Admin only)

**Request:**
`json
{
  "email": "analyst@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "analyst"
}
`

**Response:** 201 Created
`json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "analyst@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "analyst",
    "createdAt": "2026-07-23T10:00:00Z"
  }
}
`

**Validation:**
- Email: valid email format, unique
- Password: min 8 chars, uppercase, lowercase, number, special char
- Role: enum (admin, analyst, viewer)

**Authorization:** Admin only

---

#### POST /auth/login
**Description:** Authenticate user and receive tokens

**Request:**
`json
{
  "email": "analyst@example.com",
  "password": "SecurePass123!"
}
`

**Response:** 200 OK
`json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "email": "analyst@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "analyst"
    }
  }
}
`

**Errors:**
- 401: Invalid credentials
- 403: Account inactive

**Authorization:** None (public endpoint)

---

#### POST /auth/refresh
**Description:** Refresh access token using refresh token

**Request:**
`json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
`

**Response:** 200 OK
`json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
`

**Errors:**
- 401: Invalid or expired refresh token

**Authorization:** None (uses refresh token)

---

#### POST /auth/logout
**Description:** Invalidate current tokens

**Request:** No body required

**Response:** 204 No Content

**Authorization:** Authenticated users

---

#### POST /auth/forgot-password
**Description:** Request password reset email

**Request:**
`json
{
  "email": "analyst@example.com"
}
`

**Response:** 200 OK
`json
{
  "success": true,
  "data": {
    "message": "Password reset email sent"
  }
}
`

**Authorization:** None (public endpoint)

---

#### POST /auth/reset-password
**Description:** Reset password using reset token

**Request:**
`json
{
  "token": "reset_token_from_email",
  "newPassword": "NewSecurePass123!"
}
`

**Response:** 200 OK
`json
{
  "success": true,
  "data": {
    "message": "Password successfully reset"
  }
}
`

**Authorization:** None (uses reset token)

---

### 7.2 Analytics Endpoints

#### GET /analytics/overview
**Description:** Get overall metrics summary

**Query Parameters:**
`
?startDate=2026-07-01&endDate=2026-07-31&platform=instagram
`

**Response:** 200 OK
`json
{
  "success": true,
  "data": {
    "totalMentions": 15420,
    "totalReach": 5840000,
    "totalEngagement": 234500,
    "totalViews": 12300000,
    "totalLikes": 185000,
    "totalComments": 28500,
    "totalShares": 21000,
    "totalAuthors": 8240,
    "avgEngagementRate": 4.02,
    "period": {
      "startDate": "2026-07-01",
      "endDate": "2026-07-31"
    }
  }
}
`

**Authorization:** All authenticated users

---

#### GET /analytics/growth
**Description:** Get growth metrics (hourly or daily)

**Query Parameters:**
`
?period=daily&startDate=2026-07-01&endDate=2026-07-31&platform=instagram
`

**Parameters:**
- period (enum: hourly, daily, required)
- startDate (date, optional)
- endDate (date, optional)
- platform (enum, optional)

**Response:** 200 OK
`json
{
  "success": true,
  "data": [
    {
      "date": "2026-07-01",
      "posts": 520,
      "engagement": 8500,
      "reach": 185000,
      "growthRate": 12.5
    },
    {
      "date": "2026-07-02",
      "posts": 485,
      "engagement": 7800,
      "reach": 172000,
      "growthRate": -6.7
    }
  ]
}
`

**Authorization:** All authenticated users

---

#### GET /analytics/trending/keywords
**Description:** Get trending keywords

**Query Parameters:**
`
?limit=10&date=2026-07-23
`

**Response:** 200 OK
`json
{
  "success": true,
  "data": [
    {
      "keyword": "festival mbois 11",
      "mentionCount": 1240,
      "velocity": 45.2,
      "rank": 1
    },
    {
      "keyword": "lineup mbois",
      "mentionCount": 890,
      "velocity": 38.1,
      "rank": 2
    }
  ]
}
`

**Authorization:** All authenticated users

---

#### GET /analytics/trending/hashtags
**Description:** Get trending hashtags

**Query Parameters:**
`
?limit=10&date=2026-07-23
`

**Response:** 200 OK
`json
{
  "success": true,
  "data": [
    {
      "hashtag": "#mbois11",
      "mentionCount": 3420,
      "velocity": 52.8,
      "rank": 1
    },
    {
      "hashtag": "#festivalmbois",
      "mentionCount": 2890,
      "velocity": 41.3,
      "rank": 2
    }
  ]
}
`

**Authorization:** All authenticated users

---

#### GET /analytics/influencers
**Description:** Get top influencers

**Query Parameters:**
`
?limit=10&startDate=2026-07-01&endDate=2026-07-31&platform=instagram
`

**Response:** 200 OK
`json
{
  "success": true,
  "data": [
    {
      "id": "123",
      "username": "influencer_id",
      "displayName": "Influencer Name",
      "platform": "instagram",
      "followerCount": 850000,
      "isVerified": true,
      "postCount": 12,
      "totalEngagement": 145000,
      "avgEngagementPerPost": 12083.33,
      "profileUrl": "https://instagram.com/influencer_id",
      "profileImageUrl": "https://..."
    }
  ]
}
`

**Authorization:** All authenticated users

---

#### GET /analytics/top-posts
**Description:** Get top posts by engagement

**Query Parameters:**
`
?limit=20&startDate=2026-07-01&endDate=2026-07-31&platform=instagram
`

**Response:** 200 OK
`json
{
  "success": true,
  "data": [
    {
      "id": "456",
      "platform": "instagram",
      "postType": "photo",
      "text": "Amazing lineup at #festivalmbois11! Can't wait! 🎉",
      "postUrl": "https://instagram.com/p/xyz",
      "postedAt": "2026-07-15T14:30:00Z",
      "engagementScore": 28450.5,
      "sentiment": "positive",
      "likesCount": 15420,
      "commentsCount": 840,
      "sharesCount": 1250,
      "viewsCount": 125000,
      "author": {
        "username": "user123",
        "displayName": "User Name",
        "followerCount": 45000,
        "profileImageUrl": "https://..."
      },
      "mediaUrls": ["https://..."]
    }
  ]
}
`

**Authorization:** All authenticated users

---

#### GET /analytics/sentiment
**Description:** Get sentiment distribution

**Query Parameters:**
`
?startDate=2026-07-01&endDate=2026-07-31&platform=instagram
`

**Response:** 200 OK
`json
{
  "success": true,
  "data": {
    "positive": {
      "count": 8420,
      "percentage": 54.6
    },
    "neutral": {
      "count": 5840,
      "percentage": 37.9
    },
    "negative": {
      "count": 1160,
      "percentage": 7.5
    },
    "total": 15420
  }
}
`

**Authorization:** All authenticated users

---

#### GET /analytics/platform-distribution
**Description:** Get metrics by platform

**Query Parameters:**
`
?startDate=2026-07-01&endDate=2026-07-31
`

**Response:** 200 OK
`json
{
  "success": true,
  "data": [
    {
      "platform": "instagram",
      "totalPosts": 5820,
      "totalEngagement": 98500,
      "totalLikes": 78400,
      "totalComments": 12100,
      "totalShares": 8000,
      "totalViews": 0,
      "percentage": 37.7
    },
    {
      "platform": "tiktok",
      "totalPosts": 4250,
      "totalEngagement": 156000,
      "totalLikes": 98000,
      "totalComments": 18000,
      "totalShares": 12000,
      "totalViews": 5400000,
      "percentage": 27.6
    }
  ]
}
`

**Authorization:** All authenticated users

---


### 7.3 Posts Endpoints

#### GET /posts
**Description:** Get posts with filtering and pagination

**Query Parameters:**
`
?page=1&limit=20&platform=instagram&sentiment=positive&startDate=2026-07-01&endDate=2026-07-31&q=festival
`

**Response:** 200 OK
`json
{
  "success": true,
  "data": [
    {
      "id": "789",
      "platform": "instagram",
      "postType": "photo",
      "text": "Festival Mbois 11 was incredible! Best lineup ever 🎶",
      "language": "id",
      "mediaUrls": ["https://..."],
      "postUrl": "https://instagram.com/p/abc",
      "postedAt": "2026-07-20T15:45:00Z",
      "likesCount": 2840,
      "commentsCount": 156,
      "sharesCount": 89,
      "viewsCount": 0,
      "engagementScore": 3317.0,
      "sentiment": "positive",
      "sentimentConfidence": 0.9245,
      "author": {
        "id": "123",
        "username": "user123",
        "displayName": "User Name",
        "followerCount": 12400,
        "isVerified": false,
        "profileImageUrl": "https://..."
      },
      "hashtags": ["#mbois11", "#festivalmbois"],
      "location": "Malang, Indonesia"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15420,
    "totalPages": 771,
    "hasNext": true,
    "hasPrev": false
  }
}
`

**Authorization:** All authenticated users

---

#### GET /posts/:id
**Description:** Get single post details

**Response:** 200 OK
`json
{
  "success": true,
  "data": {
    "id": "789",
    "platform": "instagram",
    "postType": "photo",
    "text": "Festival Mbois 11 was incredible!",
    "language": "id",
    "mediaUrls": ["https://..."],
    "postUrl": "https://instagram.com/p/abc",
    "postedAt": "2026-07-20T15:45:00Z",
    "collectedAt": "2026-07-20T15:50:00Z",
    "likesCount": 2840,
    "commentsCount": 156,
    "sharesCount": 89,
    "viewsCount": 0,
    "engagementScore": 3317.0,
    "sentiment": "positive",
    "sentimentConfidence": 0.9245,
    "location": "Malang, Indonesia",
    "author": {
      "id": "123",
      "username": "user123",
      "displayName": "User Name",
      "bio": "Music lover | Content creator",
      "followerCount": 12400,
      "followingCount": 850,
      "postCount": 420,
      "isVerified": false,
      "profileUrl": "https://instagram.com/user123",
      "profileImageUrl": "https://..."
    },
    "hashtags": [
      {
        "id": "45",
        "tag": "#mbois11"
      },
      {
        "id": "46",
        "tag": "#festivalmbois"
      }
    ],
    "mentions": [
      {
        "id": "12",
        "username": "festivalmbois_official"
      }
    ]
  }
}
`

**Errors:**
- 404: Post not found

**Authorization:** All authenticated users

---

#### GET /posts/search
**Description:** Full-text search across posts

**Query Parameters:**
`
?q=lineup+amazing&page=1&limit=20&platform=instagram
`

**Response:** 200 OK (same format as GET /posts)

**Authorization:** All authenticated users

---

### 7.4 Keywords Endpoints

#### GET /keywords
**Description:** Get all tracked keywords

**Query Parameters:**
`
?isActive=true
`

**Response:** 200 OK
`json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "keyword": "Festival Mbois",
      "normalizedKeyword": "festival mbois",
      "isActive": true,
      "createdBy": {
        "id": "uuid",
        "email": "admin@example.com"
      },
      "createdAt": "2026-07-01T00:00:00Z",
      "updatedAt": "2026-07-01T00:00:00Z"
    }
  ]
}
`

**Authorization:** All authenticated users

---

#### POST /keywords
**Description:** Add new keyword to track (Admin only)

**Request:**
`json
{
  "keyword": "Festival Mbois 2027"
}
`

**Response:** 201 Created
`json
{
  "success": true,
  "data": {
    "id": "7",
    "keyword": "Festival Mbois 2027",
    "normalizedKeyword": "festival mbois 2027",
    "isActive": true,
    "createdAt": "2026-07-23T10:00:00Z"
  }
}
`

**Validation:**
- Keyword: required, min 2 chars, max 255 chars, unique

**Errors:**
- 409: Keyword already exists

**Authorization:** Admin only

---

#### PUT /keywords/:id
**Description:** Update keyword (Admin only)

**Request:**
`json
{
  "keyword": "Festival Mbois 2027 Updated",
  "isActive": true
}
`

**Response:** 200 OK
`json
{
  "success": true,
  "data": {
    "id": "7",
    "keyword": "Festival Mbois 2027 Updated",
    "normalizedKeyword": "festival mbois 2027 updated",
    "isActive": true,
    "updatedAt": "2026-07-23T10:05:00Z"
  }
}
`

**Authorization:** Admin only

---

#### DELETE /keywords/:id
**Description:** Delete keyword (Admin only)

**Response:** 204 No Content

**Errors:**
- 404: Keyword not found

**Authorization:** Admin only

---

### 7.5 Users Endpoints

#### GET /users
**Description:** Get all users (Admin only)

**Query Parameters:**
`
?page=1&limit=20&role=analyst&isActive=true
`

**Response:** 200 OK
`json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "analyst@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "analyst",
      "isActive": true,
      "lastLoginAt": "2026-07-23T09:00:00Z",
      "createdAt": "2026-07-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
`

**Authorization:** Admin only

---

#### GET /users/:id
**Description:** Get user details (Admin only, or own profile)

**Response:** 200 OK
`json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "analyst@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "analyst",
    "isActive": true,
    "lastLoginAt": "2026-07-23T09:00:00Z",
    "createdAt": "2026-07-01T00:00:00Z",
    "updatedAt": "2026-07-20T14:30:00Z"
  }
}
`

**Authorization:** Admin or own profile

---

#### POST /users
**Description:** Create new user (Admin only)

**Note:** Same as POST /auth/register

**Authorization:** Admin only

---

#### PUT /users/:id
**Description:** Update user (Admin only, or own profile for limited fields)

**Request (Admin):**
`json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "admin",
  "isActive": true
}
`

**Request (Self - limited fields):**
`json
{
  "firstName": "Jane",
  "lastName": "Smith"
}
`

**Response:** 200 OK
`json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "analyst@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "admin",
    "isActive": true,
    "updatedAt": "2026-07-23T10:10:00Z"
  }
}
`

**Authorization:** Admin or own profile (limited)

---

#### DELETE /users/:id
**Description:** Delete user (Admin only)

**Response:** 204 No Content

**Errors:**
- 404: User not found
- 400: Cannot delete own account

**Authorization:** Admin only

---

#### PUT /users/:id/password
**Description:** Change password (own account)

**Request:**
`json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
`

**Response:** 200 OK
`json
{
  "success": true,
  "data": {
    "message": "Password successfully changed"
  }
}
`

**Validation:**
- Current password must be correct
- New password must meet policy requirements

**Errors:**
- 401: Current password incorrect

**Authorization:** Own account only

---

### 7.6 Export Endpoints

#### GET /export/csv
**Description:** Export data to CSV (Analyst & Admin only)

**Query Parameters:**
`
?startDate=2026-07-01&endDate=2026-07-31&platform=instagram
`

**Response:** 200 OK
`
Content-Type: text/csv
Content-Disposition: attachment; filename="festival-mbois-export-20260723.csv"

id,platform,author,text,posted_at,likes,comments,shares,engagement,sentiment
789,instagram,user123,"Festival was amazing!",2026-07-20T15:45:00Z,2840,156,89,3317.0,positive
...
`

**Authorization:** Analyst, Admin

---

#### GET /export/excel
**Description:** Export data to Excel (Analyst & Admin only)

**Query Parameters:**
`
?startDate=2026-07-01&endDate=2026-07-31&platform=instagram
`

**Response:** 200 OK
`
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="festival-mbois-export-20260723.xlsx"

[Binary Excel file]
`

**Authorization:** Analyst, Admin

---

#### GET /export/pdf
**Description:** Export report to PDF (Analyst & Admin only)

**Query Parameters:**
`
?startDate=2026-07-01&endDate=2026-07-31
`

**Response:** 200 OK
`
Content-Type: application/pdf
Content-Disposition: attachment; filename="festival-mbois-report-20260723.pdf"

[Binary PDF file]
`

**Authorization:** Analyst, Admin

---

### 7.7 Health & Monitoring Endpoints

#### GET /health
**Description:** Health check endpoint

**Response:** 200 OK
`json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-07-23T10:00:00Z",
    "version": "1.0.0",
    "uptime": 86400,
    "services": {
      "database": "healthy",
      "redis": "healthy",
      "workers": "healthy"
    }
  }
}
`

**Authorization:** None (public)

---

#### GET /health/detailed
**Description:** Detailed health check (Admin only)

**Response:** 200 OK
`json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-07-23T10:00:00Z",
    "version": "1.0.0",
    "uptime": 86400,
    "services": {
      "database": {
        "status": "healthy",
        "responseTime": 12,
        "connections": 45
      },
      "redis": {
        "status": "healthy",
        "responseTime": 5,
        "memory": "512MB"
      },
      "workers": {
        "instagram": "healthy",
        "tiktok": "healthy",
        "facebook": "healthy",
        "threads": "healthy",
        "x": "healthy"
      }
    },
    "metrics": {
      "requestsPerMinute": 150,
      "avgResponseTime": 250,
      "errorRate": 0.5
    }
  }
}
`

**Authorization:** Admin only

---

## 8. WEBSOCKET API

### 8.1 WebSocket Connection

**Endpoint:** wss://api.festivalmbois.com/ws

**Authentication:** JWT token in query parameter
`
wss://api.festivalmbois.com/ws?token=<access_token>
`

### 8.2 Connection Flow

`
1. Client connects to WebSocket endpoint with JWT token
   │
   ▼
2. Server validates token
   │
   ├─ Invalid: Close connection (4401)
   │
   └─ Valid: Accept connection
      │
      ▼
   3. Server sends connection acknowledgment
      │
      ▼
   4. Client subscribes to channels
      │
      ▼
   5. Server sends real-time updates
`

### 8.3 Message Format

**Client → Server (Subscribe):**
`json
{
  "type": "subscribe",
  "channels": ["posts", "metrics"]
}
`

**Client → Server (Unsubscribe):**
`json
{
  "type": "unsubscribe",
  "channels": ["posts"]
}
`

**Server → Client (Connection ACK):**
`json
{
  "type": "connection",
  "status": "connected",
  "userId": "uuid",
  "timestamp": "2026-07-23T10:00:00Z"
}
`

**Server → Client (New Post):**
`json
{
  "type": "post",
  "event": "created",
  "data": {
    "id": "789",
    "platform": "instagram",
    "text": "Festival Mbois 11 was incredible!",
    "author": {
      "username": "user123",
      "displayName": "User Name"
    },
    "engagementScore": 3317.0,
    "sentiment": "positive",
    "postedAt": "2026-07-23T10:00:00Z"
  },
  "timestamp": "2026-07-23T10:00:05Z"
}
`

**Server → Client (Metrics Update):**
`json
{
  "type": "metrics",
  "event": "updated",
  "data": {
    "totalMentions": 15421,
    "totalEngagement": 234520,
    "lastUpdate": "2026-07-23T10:00:00Z"
  },
  "timestamp": "2026-07-23T10:00:05Z"
}
`

**Server → Client (Error):**
`json
{
  "type": "error",
  "code": "SUBSCRIPTION_ERROR",
  "message": "Failed to subscribe to channel",
  "timestamp": "2026-07-23T10:00:00Z"
}
`

### 8.4 Available Channels

| Channel | Description | Authorization |
|---------|-------------|---------------|
| posts | New post notifications | All authenticated |
| metrics | Metrics updates | All authenticated |
| 	rending | Trending keywords/hashtags | All authenticated |
| system | System alerts | Admin only |

### 8.5 WebSocket Close Codes

| Code | Meaning |
|------|---------|
| 4401 | Unauthorized (invalid token) |
| 4403 | Forbidden (insufficient permissions) |
| 4429 | Rate limit exceeded |
| 4500 | Internal server error |

---

## 9. API SECURITY

### 9.1 Security Headers

**Required Response Headers:**
`
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
`

### 9.2 CORS Configuration

**Allowed Origins:**
- Development: http://localhost:3000, http://localhost:3001
- Staging: https://staging.festivalmbois.com
- Production: https://festivalmbois.com

**Allowed Methods:**
`
GET, POST, PUT, PATCH, DELETE, OPTIONS
`

**Allowed Headers:**
`
Content-Type, Authorization, X-Request-ID, Accept-Language
`

**Exposed Headers:**
`
X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
`

### 9.3 Input Validation

**All endpoints must validate:**
- Request body schema (using class-validator)
- Query parameters (type, range, format)
- Path parameters (format, existence)
- File uploads (size, type, content)

**Example Validation:**
`	ypescript
class CreateKeywordDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  keyword: string;
}
`

### 9.4 SQL Injection Prevention

**Always use:**
- Parameterized queries (TypeORM)
- Never build SQL strings from user input
- ORM query builders

**Example (TypeORM):**
`	ypescript
// ✅ SAFE
await postRepository.find({
  where: { platform: userInput }
});

// ❌ UNSAFE
await postRepository.query(
  \SELECT * FROM posts WHERE platform = '\'\
);
`

### 9.5 Rate Limiting Implementation

**Strategy:**
- Redis-based sliding window
- Per user ID (authenticated)
- Per IP address (anonymous)
- Per endpoint (custom limits for expensive operations)

**Example:**
`	ypescript
@UseGuards(ThrottlerGuard)
@Throttle(10, 60) // 10 requests per 60 seconds
@Get('/export/csv')
async exportCsv() {
  // ...
}
`

---

## 10. API DOCUMENTATION

### 10.1 OpenAPI/Swagger

**URL:** https://api.festivalmbois.com/api/docs

**Features:**
- Interactive API explorer
- Try it out functionality
- Schema definitions
- Authentication setup
- Example requests/responses

### 10.2 Auto-Generated Documentation

**Tools:**
- @nestjs/swagger for NestJS services
- Decorators for endpoint documentation

**Example:**
`	ypescript
@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  
  @Get('overview')
  @ApiOperation({ summary: 'Get overall metrics summary' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Success', type: OverviewDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getOverview(@Query() query: OverviewQueryDto) {
    // ...
  }
}
`

---

## 11. API VERSIONING & DEPRECATION

### 11.1 Version Release Process

1. New version development in parallel
2. Beta testing in staging
3. Documentation update
4. Announcement (30 days notice)
5. Production release
6. Deprecation notice for old version (if applicable)

### 11.2 Deprecation Policy

**Timeline:**
- Deprecation announcement: 90 days before removal
- Deprecation warnings in responses
- Final removal after grace period

**Deprecation Header:**
`
Deprecation: true
Sunset: Sat, 31 Oct 2026 23:59:59 GMT
Link: <https://api.festivalmbois.com/api/v2/docs>; rel="successor-version"
`

### 11.3 Backward Compatibility

**Breaking Changes (require new version):**
- Removing endpoints or fields
- Changing response formats
- Changing authentication methods
- Renaming fields

**Non-Breaking Changes (same version):**
- Adding new endpoints
- Adding optional query parameters
- Adding new response fields
- Bug fixes

---

## 12. ERROR HANDLING

### 12.1 Error Response Format

`json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": [
      {
        "field": "fieldName",
        "message": "Specific field error"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-07-23T10:00:00Z",
    "requestId": "uuid",
    "path": "/api/v1/posts",
    "method": "GET"
  }
}
`

### 12.2 Validation Error Example

`json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      },
      {
        "field": "password",
        "message": "Password must be at least 8 characters"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-07-23T10:00:00Z",
    "requestId": "uuid",
    "path": "/api/v1/auth/register",
    "method": "POST"
  }
}
`

### 12.3 Error Logging

**All errors must be logged with:**
- Request ID
- User ID (if authenticated)
- Endpoint
- Error details
- Stack trace (for 500 errors)

---

## 13. PERFORMANCE CONSIDERATIONS

### 13.1 Response Time Targets

| Endpoint Type | Target | Max |
|---------------|--------|-----|
| Simple GET | < 200ms | 500ms |
| Complex analytics | < 500ms | 1s |
| Exports | < 10s | 30s |
| WebSocket latency | < 3s | 5s |

### 13.2 Optimization Strategies

**Caching:**
- Redis cache for frequently accessed data
- Cache-Control headers for client-side caching
- ETags for conditional requests

**Database:**
- Index optimization
- Query optimization
- Read replicas for analytics
- Connection pooling

**Pagination:**
- Cursor-based pagination for large datasets
- Limit max page size (100 items)

**Compression:**
- GZIP compression for responses
- Minimum size threshold: 1KB

---

## 14. TESTING

### 14.1 API Testing Strategy

**Unit Tests:**
- Business logic
- Validation
- Transformations

**Integration Tests:**
- End-to-end API flows
- Database interactions
- Authentication/authorization

**Load Tests:**
- 100 concurrent users
- 10,000 requests/minute
- Response time under load

### 14.2 Test Environments

**Development:** http://localhost:3000/api/v1  
**Staging:** https://staging-api.festivalmbois.com/api/v1  
**Production:** https://api.festivalmbois.com/api/v1

---

## 15. API MONITORING & OBSERVABILITY

### 15.1 Metrics to Track

- Request rate (per endpoint)
- Response time (p50, p95, p99)
- Error rate (per endpoint)
- Authentication failures
- Rate limit hits
- Database query time
- Cache hit/miss ratio

### 15.2 Alerting Rules

**Critical Alerts:**
- API downtime (> 1 minute)
- Error rate > 5%
- Response time > 2s (p95)
- Database connection failures

**Warning Alerts:**
- Error rate > 2%
- Response time > 1s (p95)
- Cache hit rate < 70%
- High rate limit usage (> 80%)

---

## 16. APPROVAL & NEXT STEPS

### 16.1 Review Checklist
- [ ] All endpoints documented
- [ ] Authentication/authorization specified
- [ ] Error handling standardized
- [ ] Rate limiting configured
- [ ] Security measures implemented
- [ ] Performance targets defined
- [ ] OpenAPI specification generated

### 16.2 Implementation Checklist
- [ ] NestJS controllers created
- [ ] DTOs and validation defined
- [ ] Authentication guards implemented
- [ ] Rate limiting configured
- [ ] Swagger documentation added
- [ ] Integration tests written
- [ ] API documentation deployed

### 16.3 Next Documents
1. ✅ PRD
2. ✅ System Design
3. ✅ Database Design
4. ✅ API Design (this document)
5. ⏭️ Frontend Architecture
6. ⏭️ Development Roadmap
7. ⏭️ Task Breakdown

---

**Document Status:** Ready for Review  
**Next Action:** Frontend Architecture Document

