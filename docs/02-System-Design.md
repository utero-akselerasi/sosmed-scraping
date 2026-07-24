# System Design Document
# Festival Mbois Intelligence Platform

**Version:** 1.0  
**Date:** July 23, 2026  
**Status:** Draft for Approval

---

## 1. SYSTEM OVERVIEW

### 1.1 Purpose
This document describes the high-level architecture, components, data flow, and technical design decisions for the Festival Mbois Intelligence Platform - an enterprise social media intelligence system.

### 1.2 Architectural Style
**Microservices Architecture** with event-driven processing and CQRS (Command Query Responsibility Segregation) pattern for analytics.

### 1.3 Design Principles
- **Separation of Concerns:** Each service has a single responsibility
- **Loose Coupling:** Services communicate via APIs and message queues
- **High Cohesion:** Related functionality grouped together
- **Fault Isolation:** Service failures don't cascade
- **Scalability:** Horizontal scaling at every layer
- **Observability:** Comprehensive logging, monitoring, and tracing

---

## 2. SYSTEM ARCHITECTURE

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Next.js Frontend (React + TypeScript + TailwindCSS)     │  │
│  │  - Dashboard UI                                           │  │
│  │  - Real-time Updates (WebSocket)                         │  │
│  │  - Charts & Visualizations                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ HTTPS / WSS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          API GATEWAY                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  NestJS API Gateway                                       │  │
│  │  - Authentication (JWT)                                   │  │
│  │  - Rate Limiting                                          │  │
│  │  - Request Routing                                        │  │
│  │  - Load Balancing                                         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Analytics  │    │     User     │    │   Content    │
│   Service    │    │   Service    │    │   Service    │
│  (NestJS)    │    │  (NestJS)    │    │  (NestJS)    │
└──────────────┘    └──────────────┘    └──────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
                    ┌──────────────────┐
                    │   PostgreSQL     │
                    │   (Primary DB)   │
                    └──────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      PROCESSING LAYER                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Message Queue (Redis / Bull)                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│         ▲         ▲         ▲         ▲         ▲              │
│         │         │         │         │         │              │
│  ┌──────┴───┐ ┌──┴────┐ ┌──┴─────┐ ┌─┴──────┐ ┌┴────────┐   │
│  │Instagram │ │TikTok │ │Facebook│ │Threads │ │    X    │   │
│  │ Worker   │ │Worker │ │ Worker │ │ Worker │ │ Worker  │   │
│  │(Python)  │ │(Py)   │ │(Python)│ │(Python)│ │(Python) │   │
│  └──────────┘ └───────┘ └────────┘ └────────┘ └─────────┘   │
│         │         │         │         │         │              │
│         └─────────┴─────────┴─────────┴─────────┘              │
│                           │                                     │
│                  ┌────────▼─────────┐                          │
│                  │  Normalization   │                          │
│                  │     Service      │                          │
│                  │    (NestJS)      │                          │
│                  └────────┬─────────┘                          │
│                           │                                     │
│                  ┌────────▼─────────┐                          │
│                  │   AI Sentiment   │                          │
│                  │     Service      │                          │
│                  │ (Python/FastAPI) │                          │
│                  └──────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   Redis Cache    │
                    │  + Job Queue     │
                    └──────────────────┘
```

### 2.2 Component Breakdown

#### 2.2.1 Frontend Layer
**Technology:** Next.js 14+ (App Router), React 18+, TypeScript, TailwindCSS, Shadcn UI

**Responsibilities:**
- User interface rendering
- Client-side state management (Zustand/Redux)
- Real-time data updates via WebSocket
- Data visualization (Recharts/Chart.js)
- Client-side routing
- Authentication flow

**Key Features:**
- Server-side rendering (SSR) for SEO
- Static generation for performance
- Incremental static regeneration
- API routes for BFF pattern
- Responsive design (mobile-first)

#### 2.2.2 API Gateway
**Technology:** NestJS (TypeScript)

**Responsibilities:**
- Single entry point for all client requests
- JWT authentication and authorization
- Rate limiting (per user/IP)
- Request validation
- Load balancing
- API versioning
- CORS handling
- WebSocket gateway

**Design Pattern:**
- Gateway pattern
- Circuit breaker for downstream services
- Request/response transformation
- Centralized logging

#### 2.2.3 Core Services

**Analytics Service**
**Technology:** NestJS + TypeScript
**Responsibilities:**
- Aggregate metrics calculation
- Trending analysis
- Growth metrics (hourly/daily)
- Top influencers ranking
- Top posts ranking
- Platform distribution
- Time-series data
- Export generation (CSV/Excel/PDF)

**Pattern:** CQRS (read-optimized)
**Database:** PostgreSQL (read replicas)
**Caching:** Redis (heavy caching)

**User Service**
**Technology:** NestJS + TypeScript
**Responsibilities:**
- User authentication (JWT)
- User registration
- Password management
- Role-based access control (RBAC)
- User profile management
- Audit logging
- Session management

**Pattern:** Repository pattern
**Database:** PostgreSQL
**Security:** Bcrypt for passwords, JWT tokens

**Content Service**
**Technology:** NestJS + TypeScript
**Responsibilities:**
- Post CRUD operations
- Keyword management
- Search and filtering
- Pagination
- Post metadata management
- Media URL handling

**Pattern:** Repository pattern
**Database:** PostgreSQL (with full-text search)

#### 2.2.4 Worker Services (Data Collection)

**Platform Workers**
- Instagram Worker (Python)
- TikTok Worker (Python)
- Facebook Worker (Python)
- Threads Worker (Python)
- X Worker (Python)

**Technology:** Python 3.11+, AsyncIO, aiohttp

**Responsibilities:**
- Scrape/API calls to social platforms
- Respect rate limits
- Handle errors gracefully
- Retry with exponential backoff
- Queue data for processing
- Health check reporting

**Pattern:** Worker pattern with job queue
**Queue:** Redis (Bull/BullMQ)
**Scheduling:** Cron-like (every 15 minutes)

**Key Design:**
- Independent deployment
- Independent scaling
- Failure isolation
- Circuit breaker pattern
- Graceful shutdown

#### 2.2.5 Normalization Service
**Technology:** NestJS + TypeScript

**Responsibilities:**
- Transform platform-specific data to unified schema
- Extract hashtags and mentions
- Validate data integrity
- Deduplicate posts
- Enrich metadata
- Queue for sentiment analysis

**Pattern:** ETL pipeline
**Queue:** Redis

#### 2.2.6 AI Sentiment Service
**Technology:** Python + FastAPI, Transformers (HuggingFace), PyTorch

**Responsibilities:**
- Sentiment classification (Positive/Neutral/Negative)
- Confidence score calculation
- Indonesian language processing
- Daily summary generation
- Emoji and slang handling

**Model:** Fine-tuned BERT for Indonesian sentiment
**API:** RESTful (async)
**Caching:** Redis for results

---

## 3. DATA FLOW

### 3.1 Data Collection Flow

```
1. Scheduler triggers worker (every 15 minutes)
   │
   ▼
2. Worker queries social platform
   │
   ├─ Success: Extract raw data
   │  │
   │  ▼
   │  3. Push to Normalization Queue
   │     │
   │     ▼
   │  4. Normalization Service processes
   │     ├─ Transform to unified schema
   │     ├─ Deduplicate
   │     ├─ Extract hashtags/mentions
   │     │
   │     ▼
   │  5. Save to PostgreSQL
   │     │
   │     ▼
   │  6. Push to Sentiment Queue
   │     │
   │     ▼
   │  7. AI Sentiment Service classifies
   │     │
   │     ▼
   │  8. Update post with sentiment
   │     │
   │     ▼
   │  9. Invalidate cache
   │     │
   │     ▼
   │  10. Notify via WebSocket
   │
   └─ Failure: Log error, retry with backoff
```

### 3.2 Query Flow (Dashboard)

```
1. User requests dashboard data
   │
   ▼
2. API Gateway validates JWT
   │
   ├─ Invalid: Return 401
   │
   └─ Valid:
      │
      ▼
   3. Check Redis cache
      │
      ├─ Cache hit: Return cached data
      │
      └─ Cache miss:
         │
         ▼
      4. Query Analytics Service
         │
         ▼
      5. Analytics Service queries PostgreSQL
         │
         ▼
      6. Calculate/aggregate metrics
         │
         ▼
      7. Store in Redis (TTL: 5 minutes)
         │
         ▼
      8. Return to client
```

### 3.3 Real-time Update Flow

```
1. New post processed
   │
   ▼
2. Cache invalidation
   │
   ▼
3. Publish event to Redis Pub/Sub
   │
   ▼
4. WebSocket Gateway receives event
   │
   ▼
5. Broadcast to connected clients
   │
   ▼
6. Client updates UI incrementally
```

---

## 4. DATABASE DESIGN (High-Level)

### 4.1 Database Strategy
- **PostgreSQL:** Primary data store (ACID compliance)
- **Redis:** Caching, job queue, pub/sub
- **Partitioning:** By date (monthly partitions for posts table)
- **Indexing:** Strategic indexes for queries
- **Replication:** Master-slave for read scaling

### 4.2 Key Tables (Overview)

```
users
├─ id (PK)
├─ email (unique)
├─ password_hash
├─ role (admin/analyst/viewer)
├─ created_at
└─ updated_at

posts
├─ id (PK)
├─ platform (enum: instagram/tiktok/facebook/threads/x)
├─ platform_post_id (unique per platform)
├─ author_id (FK → authors)
├─ text
├─ media_urls (jsonb)
├─ posted_at
├─ collected_at
├─ likes_count
├─ comments_count
├─ shares_count
├─ views_count
├─ engagement_score (calculated)
├─ sentiment (enum: positive/neutral/negative)
├─ sentiment_confidence
└─ language

authors
├─ id (PK)
├─ platform
├─ platform_user_id (unique per platform)
├─ username
├─ display_name
├─ follower_count
├─ profile_url
└─ last_updated

hashtags
├─ id (PK)
├─ tag (unique)
└─ created_at

post_hashtags (many-to-many)
├─ post_id (FK)
└─ hashtag_id (FK)

keywords
├─ id (PK)
├─ keyword (unique)
├─ is_active
└─ created_at

metrics_daily (aggregated)
├─ date (PK)
├─ platform
├─ total_posts
├─ total_engagement
├─ total_reach
├─ sentiment_positive
├─ sentiment_neutral
└─ sentiment_negative
```

---

## 5. API DESIGN (High-Level)

### 5.1 API Structure

**Base URL:** `https://api.festivalmbois.com/v1`

**Authentication:** JWT Bearer Token

**Response Format:** JSON

**Error Format:**
```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request",
  "timestamp": "2026-07-23T10:00:00Z"
}
```

### 5.2 Key Endpoints

#### Authentication
```
POST   /auth/login
POST   /auth/register
POST   /auth/refresh
POST   /auth/logout
POST   /auth/forgot-password
POST   /auth/reset-password
```

#### Analytics
```
GET    /analytics/overview
GET    /analytics/metrics?startDate=&endDate=&platform=
GET    /analytics/growth?period=hourly|daily
GET    /analytics/trending/keywords
GET    /analytics/trending/hashtags
GET    /analytics/influencers?limit=10
GET    /analytics/top-posts?limit=20
GET    /analytics/sentiment
GET    /analytics/platform-distribution
```

#### Content
```
GET    /posts?page=&limit=&platform=&sentiment=&startDate=&endDate=
GET    /posts/:id
GET    /posts/search?q=
```

#### Keywords
```
GET    /keywords
POST   /keywords
PUT    /keywords/:id
DELETE /keywords/:id
```

#### Users (Admin only)
```
GET    /users
GET    /users/:id
POST   /users
PUT    /users/:id
DELETE /users/:id
```

#### Export
```
GET    /export/csv?startDate=&endDate=
GET    /export/excel?startDate=&endDate=
GET    /export/pdf?startDate=&endDate=
```

#### WebSocket
```
WS     /ws/updates
```

### 5.3 Rate Limiting
- Anonymous: 20 requests/minute
- Authenticated: 100 requests/minute
- Admin: 200 requests/minute

---

## 6. TECHNOLOGY STACK

### 6.1 Frontend
| Component | Technology | Justification |
|-----------|------------|---------------|
| Framework | Next.js 14+ | SSR, performance, SEO, TypeScript support |
| UI Library | React 18+ | Industry standard, component-based |
| Language | TypeScript | Type safety, better DX |
| Styling | TailwindCSS | Utility-first, fast development |
| Components | Shadcn UI | Accessible, customizable |
| State Management | Zustand | Lightweight, simple API |
| Charts | Recharts | React-native, composable |
| HTTP Client | Axios | Interceptors, easy config |
| WebSocket | Socket.IO Client | Real-time, fallback support |

### 6.2 Backend (Services)
| Component | Technology | Justification |
|-----------|------------|---------------|
| Framework | NestJS | Enterprise-grade, TypeScript, modular |
| Language | TypeScript | Type safety, maintainability |
| Validation | class-validator | Declarative validation |
| ORM | TypeORM | TypeScript-first, migrations |
| Authentication | Passport + JWT | Industry standard |
| Documentation | Swagger/OpenAPI | Auto-generated docs |
| Testing | Jest | Built-in NestJS support |

### 6.3 Workers
| Component | Technology | Justification |
|-----------|------------|---------------|
| Language | Python 3.11+ | Rich ecosystem for scraping |
| Async | asyncio + aiohttp | High concurrency |
| Scraping | BeautifulSoup4, Playwright | Flexible parsing |
| Queue | Redis + Python RQ | Simple, reliable |
| Scheduling | APScheduler | Cron-like scheduling |

### 6.4 AI/ML
| Component | Technology | Justification |
|-----------|------------|---------------|
| Framework | FastAPI | Fast, async, Python |
| ML Library | Transformers (HuggingFace) | Pre-trained models |
| Deep Learning | PyTorch | Flexibility, research support |
| Model | IndoBERT | Indonesian language |
| API | RESTful + async | Performance |

### 6.5 Infrastructure
| Component | Technology | Justification |
|-----------|------------|---------------|
| Database | PostgreSQL 15+ | ACID, reliability, JSON support |
| Cache | Redis 7+ | Speed, pub/sub, job queue |
| Queue | Bull (Redis-based) | NestJS integration |
| Containerization | Docker | Consistency, isolation |
| Orchestration | Docker Compose | Simple multi-container |
| Reverse Proxy | Nginx | Performance, SSL termination |
| Process Manager | PM2 | Node.js process management |

### 6.6 DevOps & Monitoring
| Component | Technology | Justification |
|-----------|------------|---------------|
| Version Control | Git | Industry standard |
| CI/CD | GitHub Actions | Integrated, free |
| Logging | Winston + Morgan | Structured logging |
| Monitoring | Prometheus + Grafana | Metrics, visualization |
| Error Tracking | Sentry | Error aggregation |
| Health Checks | /health endpoints | Service availability |

---

## 7. SECURITY ARCHITECTURE

### 7.1 Authentication & Authorization
- **JWT Tokens:** 24-hour expiry, refresh tokens
- **Password Policy:** Min 8 chars, uppercase, lowercase, number, special
- **Password Hashing:** bcrypt (cost factor: 12)
- **Role-Based Access Control (RBAC):**
  - Admin: Full access
  - Analyst: Read + export
  - Viewer: Read only

### 7.2 API Security
- **HTTPS Only:** TLS 1.3
- **CORS:** Whitelist origins
- **Rate Limiting:** Per user/IP
- **Input Validation:** All endpoints
- **SQL Injection Prevention:** Parameterized queries (TypeORM)
- **XSS Prevention:** Output sanitization
- **CSRF Protection:** CSRF tokens for state-changing operations
- **Security Headers:** Helmet.js

### 7.3 Data Security
- **Encryption at Rest:** Database encryption
- **Encryption in Transit:** HTTPS/WSS
- **Secrets Management:** Environment variables, never in code
- **Audit Logging:** All sensitive operations logged

### 7.4 Infrastructure Security
- **Firewall:** Only necessary ports open
- **Database:** Not publicly accessible
- **Redis:** Password-protected
- **Docker:** Non-root users
- **Dependencies:** Regular security audits (npm audit, Snyk)

---

## 8. SCALABILITY STRATEGY

### 8.1 Horizontal Scaling
- **Frontend:** Multiple Next.js instances behind load balancer
- **API Gateway:** Stateless, scale horizontally
- **Services:** Independent scaling per service
- **Workers:** Scale per platform demand
- **Database:** Read replicas for queries

### 8.2 Vertical Scaling
- **Database:** Upgrade resources as needed
- **Redis:** Memory expansion
- **AI Service:** GPU for ML inference

### 8.3 Caching Strategy
- **L1 Cache:** In-memory (service-level)
- **L2 Cache:** Redis (shared)
- **Cache Invalidation:** Event-driven
- **TTL Strategy:** 
  - Real-time metrics: 1 minute
  - Aggregated metrics: 5 minutes
  - Historical data: 1 hour

### 8.4 Database Optimization
- **Indexing:** Strategic indexes on queries
- **Partitioning:** Monthly partitions for posts
- **Archival:** Move old data to cold storage (after 12 months)
- **Connection Pooling:** Limit connections

---

## 9. RELIABILITY & AVAILABILITY

### 9.1 High Availability
- **Load Balancer:** Nginx with health checks
- **Service Redundancy:** Multiple instances
- **Database:** Master-slave replication
- **Graceful Degradation:** Serve stale cache if DB down

### 9.2 Fault Tolerance
- **Circuit Breaker:** Prevent cascade failures
- **Retry Logic:** Exponential backoff
- **Timeout Handling:** Request timeouts
- **Worker Isolation:** Platform failures don't affect others

### 9.3 Disaster Recovery
- **Database Backups:** Daily automated backups
- **Backup Retention:** 30 days
- **Recovery Time Objective (RTO):** 4 hours
- **Recovery Point Objective (RPO):** 24 hours

### 9.4 Monitoring & Alerting
- **Health Checks:** /health endpoints (every 30s)
- **Metrics Collection:** Prometheus
- **Visualization:** Grafana dashboards
- **Alerts:**
  - Service down
  - High error rate (>5%)
  - Database connection issues
  - Worker failures
  - High response time (>1s)
  - Disk space low (<20%)

---

## 10. DEPLOYMENT ARCHITECTURE

### 10.1 Environment Strategy
- **Development:** Local Docker Compose
- **Staging:** Cloud-hosted, mirrors production
- **Production:** Cloud-hosted, highly available

### 10.2 Container Architecture

```
docker-compose.yml

services:
  - nginx (reverse proxy)
  - frontend (Next.js)
  - api-gateway (NestJS)
  - analytics-service (NestJS)
  - user-service (NestJS)
  - content-service (NestJS)
  - normalization-service (NestJS)
  - sentiment-service (FastAPI)
  - instagram-worker (Python)
  - tiktok-worker (Python)
  - facebook-worker (Python)
  - threads-worker (Python)
  - x-worker (Python)
  - postgres (database)
  - redis (cache + queue)
  - prometheus (monitoring)
  - grafana (visualization)
```

### 10.3 CI/CD Pipeline

```
1. Developer pushes code
   │
   ▼
2. GitHub Actions triggered
   │
   ▼
3. Run linting (ESLint, Prettier)
   │
   ▼
4. Run unit tests
   │
   ▼
5. Run integration tests
   │
   ▼
6. Build Docker images
   │
   ▼
7. Push to container registry
   │
   ▼
8. Deploy to staging (auto)
   │
   ▼
9. Run smoke tests
   │
   ▼
10. Manual approval for production
    │
    ▼
11. Deploy to production (blue-green)
    │
    ▼
12. Health check verification
    │
    ▼
13. Rollback if issues detected
```

---

## 11. PERFORMANCE REQUIREMENTS

### 11.1 Response Time Targets
| Operation | Target | Max |
|-----------|--------|-----|
| Dashboard load | < 2s | 3s |
| API response (simple) | < 200ms | 500ms |
| API response (complex) | < 500ms | 1s |
| Search | < 500ms | 1s |
| Export generation | < 10s | 30s |
| Real-time update latency | < 3s | 5s |

### 11.2 Throughput Targets
- **Concurrent Users:** 100
- **API Requests:** 10,000 requests/minute
- **Worker Throughput:** 1,000 posts/minute
- **WebSocket Connections:** 200 concurrent

### 11.3 Resource Limits
| Service | CPU | Memory | Storage |
|---------|-----|--------|---------|
| Frontend | 1 core | 512MB | 1GB |
| API Gateway | 2 cores | 1GB | 500MB |
| Services | 1 core | 512MB | 500MB |
| Workers | 1 core | 512MB | 500MB |
| PostgreSQL | 4 cores | 4GB | 100GB |
| Redis | 2 cores | 2GB | 10GB |
| Sentiment | 2 cores (GPU preferred) | 2GB | 5GB |

---

## 12. DATA RETENTION & ARCHIVAL

### 12.1 Retention Policy
- **Active Data:** 12 months in hot storage (PostgreSQL)
- **Archived Data:** 12-36 months in cold storage (S3/equivalent)
- **Backups:** 30 days rolling

### 12.2 Archival Strategy
- **Monthly Job:** Archive posts older than 12 months
- **Archive Format:** Parquet (compressed, columnar)
- **Archive Access:** On-demand query (Athena/BigQuery)

### 12.3 Data Deletion
- **User Requests:** GDPR compliance (delete on request)
- **Post Deletion:** Soft delete (marked as deleted)
- **Permanent Deletion:** After 90 days

---

## 13. TRADE-OFFS & DESIGN DECISIONS

### 13.1 Microservices vs Monolith
**Decision:** Microservices

**Justification:**
- ✅ Independent scaling per service
- ✅ Technology flexibility (Python workers + Node services)
- ✅ Fault isolation
- ✅ Team autonomy
- ❌ Increased complexity
- ❌ Network overhead

**Mitigation:** Start with fewer services, split as needed

### 13.2 PostgreSQL vs NoSQL
**Decision:** PostgreSQL

**Justification:**
- ✅ ACID compliance
- ✅ Complex queries (joins, aggregations)
- ✅ Strong consistency
- ✅ JSON support (flexible schema)
- ❌ Horizontal scaling harder
- ❌ Higher resource usage

**Mitigation:** Read replicas, partitioning, caching

### 13.3 Scraping vs Official APIs
**Decision:** Scraping (where APIs unavailable)

**Justification:**
- ✅ Access to public data
- ✅ Cost-effective (no API fees)
- ❌ Fragile (platform changes)
- ❌ Legal/ToS risks
- ❌ Ethical considerations

**Mitigation:** Modular workers, respect robots.txt, public data only, legal review

### 13.4 Real-time vs Batch Processing
**Decision:** Near real-time (15-minute intervals)

**Justification:**
- ✅ Sufficient for business needs
- ✅ Reduces API/scraping load
- ✅ Allows batching for efficiency
- ❌ Not truly real-time

**Mitigation:** WebSocket for immediate updates once data processed

### 13.5 Server-Side vs Client-Side Rendering
**Decision:** Hybrid (SSR + CSR)

**Justification:**
- ✅ SEO benefits (SSR)
- ✅ Fast initial load (SSR)
- ✅ Interactive UI (CSR)
- ✅ Best of both worlds

**Implementation:** Next.js with App Router

### 13.6 TypeScript Everywhere vs Mixed
**Decision:** TypeScript for services, Python for workers

**Justification:**
- ✅ TypeScript: Type safety, maintainability for long-lived services
- ✅ Python: Rich ecosystem for scraping/ML
- ❌ Language context switching

**Mitigation:** Clear service boundaries, shared protocols (JSON)

---

## 14. FUTURE ENHANCEMENTS

### 14.1 Phase 2 (Months 4-6)
- Advanced competitor tracking
- Automated alerting (email/SMS)
- Custom dashboard widgets
- Historical data import
- Advanced NLP (entity extraction, topic modeling)

### 14.2 Phase 3 (Months 7-12)
- Mobile applications (iOS/Android)
- Predictive analytics
- Integration APIs (Slack, Teams)
- White-label solution
- Multi-event support
- Real-time crisis detection

### 14.3 Scalability Roadmap
- Kubernetes orchestration
- Multi-region deployment
- CDN for static assets
- Elasticsearch for advanced search
- Data lake for big data analytics

---

## 15. OPEN QUESTIONS & RISKS

### 15.1 Technical Questions
1. Which cloud provider? (AWS/GCP/Azure)
2. GPU availability for sentiment model?
3. Do we need Kubernetes or Docker Compose sufficient?
4. Email service provider? (SendGrid/AWS SES)
5. Monitoring stack preferences?

### 15.2 Business Questions
1. Expected data volume (posts/day)?
2. Budget constraints?
3. Compliance requirements (GDPR, Indonesian law)?
4. User onboarding strategy?
5. Support for multiple festivals (multi-tenant)?

### 15.3 Technical Risks
1. **Platform API changes:** High probability, high impact
2. **Scraping reliability:** Medium probability, high impact
3. **Sentiment accuracy:** Medium probability, medium impact
4. **Data volume explosion:** Low probability, high impact
5. **Performance at scale:** Medium probability, medium impact

---

## 16. APPROVAL & NEXT STEPS

### 16.1 Review Checklist
- [ ] Architecture approved by tech lead
- [ ] Security review completed
- [ ] Performance requirements validated
- [ ] Cost estimation approved
- [ ] Legal/compliance review
- [ ] Stakeholder sign-off

### 16.2 Next Documents
1. ✅ PRD (completed)
2. ✅ System Design (this document)
3. ⏭️ Database Design (detailed schema)
4. ⏭️ API Design (full specification)
5. ⏭️ Frontend Architecture (component structure)
6. ⏭️ Development Roadmap
7. ⏭️ Task Breakdown

---

**Document Status:** Ready for Review  
**Next Action:** Database Design Document

