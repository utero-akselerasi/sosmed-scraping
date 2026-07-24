# Product Requirements Document (PRD)
# Festival Mbois Intelligence Platform

**Version:** 1.0  
**Date:** July 23, 2026  
**Status:** Draft for Approval

---

## 1. EXECUTIVE SUMMARY

### 1.1 Product Vision
Festival Mbois Intelligence Platform is an enterprise-grade social media intelligence system designed to monitor, analyze, and provide actionable insights from public conversations about Festival Mbois across Indonesian social media platforms.

### 1.2 Business Objectives
- **Real-time Monitoring:** Track brand mentions across 5 major social platforms
- **Audience Intelligence:** Understand reach, engagement, and sentiment
- **Competitive Intelligence:** Identify trends, influencers, and growth patterns
- **Data-Driven Decisions:** Enable strategic planning through comprehensive analytics

### 1.3 Target Users
- **Event Organizers:** Festival Mbois management team
- **Marketing Teams:** Campaign performance tracking
- **PR Teams:** Reputation monitoring and crisis management
- **Data Analysts:** Deep-dive analytics and reporting

---

## 2. PRODUCT SCOPE

### 2.1 In Scope

#### Platforms
- Instagram (public posts, hashtags, mentions)
- TikTok (public videos, hashtags)
- Facebook (public pages, posts)
- Threads (public threads, hashtags)
- X/Twitter (public tweets, hashtags)

#### Keywords & Tracking
- Festival Mbois
- Festival Mbois 11
- Festival Mbois 2026
- Festival Mbois Malang
- #mbois11
- #festivalmbois11
- Custom keyword management (add/remove/edit)

#### Core Features
1. **Metrics Dashboard**
   - Total Mentions
   - Total Reach (unique users reached)
   - Total Engagement (likes + comments + shares)
   - Total Views (video/story views)
   - Total Likes
   - Total Comments
   - Total Shares
   - Total Authors (unique content creators)

2. **Influencer Intelligence**
   - Top Influencers (by follower count)
   - Top Public Profiles (by engagement)
   - Influencer ranking algorithm
   - Profile analytics

3. **Content Analytics**
   - Top Posts (by engagement)
   - Content performance metrics
   - Media type distribution (photo/video/text)
   - Post timeline visualization

4. **Trend Analysis**
   - Trending Keywords (emerging terms)
   - Trending Hashtags (volume & velocity)
   - Daily Growth Metrics
   - Hourly Growth Metrics
   - Time-series analysis

5. **Sentiment Analysis**
   - AI-powered classification (Positive/Neutral/Negative)
   - Sentiment distribution over time
   - Sentiment by platform
   - Daily AI-generated summaries

6. **Platform Distribution**
   - Cross-platform comparison
   - Platform-specific metrics
   - Share of voice analysis

7. **Export & Reporting**
   - CSV/Excel export
   - PDF reports
   - Scheduled reports
   - Custom date ranges

8. **User Management**
   - Role-based access control
   - Admin, Analyst, Viewer roles
   - Audit logging

### 2.2 Out of Scope (Phase 1)
- Private account monitoring
- Direct messaging analysis
- Competitor brand tracking
- Automated response systems
- Mobile native applications
- Integration with marketing automation tools
- Historical data import (pre-deployment)

---

## 3. USER PERSONAS

### 3.1 Admin (Festival Director)
**Goals:** 
- Overall platform health monitoring
- User management
- System configuration

**Needs:**
- Full access to all features
- System status dashboard
- User activity logs

### 3.2 Analyst (Marketing Manager)
**Goals:**
- Campaign performance analysis
- Influencer identification
- Trend forecasting

**Needs:**
- Advanced filtering
- Export capabilities
- Custom date ranges
- Deep-dive analytics

### 3.3 Viewer (PR Coordinator)
**Goals:**
- Quick sentiment checks
- Daily summaries
- Crisis detection

**Needs:**
- Real-time updates
- Sentiment alerts
- Read-only dashboard access

---

## 4. FUNCTIONAL REQUIREMENTS

### 4.1 Data Collection
**FR-001:** System must collect public posts from 5 social platforms  
**FR-002:** System must support configurable keyword tracking  
**FR-003:** System must handle rate limiting gracefully  
**FR-004:** System must deduplicate posts across platforms  
**FR-005:** System must collect data every 15 minutes (configurable)  
**FR-006:** Each platform worker must operate independently  
**FR-007:** Worker failure must not affect other workers  

### 4.2 Data Processing
**FR-008:** System must normalize data from different platforms  
**FR-009:** System must extract metadata (author, timestamp, engagement)  
**FR-010:** System must process media URLs (images/videos)  
**FR-011:** System must handle text encoding (Indonesian language)  
**FR-012:** System must queue data for processing  
**FR-013:** System must validate data integrity  

### 4.3 Analytics Engine
**FR-014:** System must calculate aggregated metrics in real-time  
**FR-015:** System must track growth metrics (hourly/daily)  
**FR-016:** System must identify trending keywords (24hr window)  
**FR-017:** System must identify trending hashtags (24hr window)  
**FR-018:** System must rank influencers by multiple criteria  
**FR-019:** System must calculate sentiment scores  

### 4.4 AI Sentiment Analysis
**FR-020:** System must classify sentiment (positive/neutral/negative)  
**FR-021:** System must support Indonesian language sentiment  
**FR-022:** System must generate daily summaries  
**FR-023:** System must provide confidence scores  
**FR-024:** System must handle emoji/slang analysis  

### 4.5 Dashboard & Visualization
**FR-025:** Dashboard must display real-time metrics  
**FR-026:** Dashboard must support date range filtering  
**FR-027:** Dashboard must support platform filtering  
**FR-028:** Dashboard must show time-series charts  
**FR-029:** Dashboard must display top influencers (top 10)  
**FR-030:** Dashboard must display top posts (top 20)  
**FR-031:** Dashboard must show mention feed (paginated)  
**FR-032:** Dashboard must support dark mode  
**FR-033:** Dashboard must be responsive (desktop/tablet)  

### 4.6 User Management
**FR-034:** System must support JWT authentication  
**FR-035:** System must implement role-based access control  
**FR-036:** System must log user actions (audit trail)  
**FR-037:** System must support password reset  
**FR-038:** System must enforce strong password policy  

### 4.7 API
**FR-039:** System must provide RESTful API  
**FR-040:** System must support WebSocket for real-time updates  
**FR-041:** API must implement rate limiting  
**FR-042:** API must return paginated results  
**FR-043:** API must support filtering and sorting  

### 4.8 Export & Reporting
**FR-044:** System must export data to CSV  
**FR-045:** System must export data to Excel  
**FR-046:** System must generate PDF reports  
**FR-047:** Export must respect user permissions  

---

## 5. NON-FUNCTIONAL REQUIREMENTS

### 5.1 Performance
**NFR-001:** Dashboard must load within 2 seconds  
**NFR-002:** API response time must be < 500ms (p95)  
**NFR-003:** System must support 100 concurrent users  
**NFR-004:** System must handle 1M posts in database  
**NFR-005:** Real-time updates must have < 3s latency  
**NFR-006:** Search must return results within 1 second  

### 5.2 Scalability
**NFR-007:** Architecture must support horizontal scaling  
**NFR-008:** Database must support partitioning  
**NFR-009:** Workers must scale independently  
**NFR-010:** System must support 10M posts (future)  

### 5.3 Reliability
**NFR-011:** System uptime must be 99.5%  
**NFR-012:** Data collection must have automatic retry  
**NFR-013:** Failed workers must auto-restart  
**NFR-014:** System must have health check endpoints  
**NFR-015:** Critical errors must trigger alerts  

### 5.4 Security
**NFR-016:** All API endpoints must require authentication  
**NFR-017:** Passwords must be hashed (bcrypt)  
**NFR-018:** JWT tokens must expire after 24 hours  
**NFR-019:** System must implement CORS properly  
**NFR-020:** System must prevent SQL injection  
**NFR-021:** System must prevent XSS attacks  
**NFR-022:** System must implement CSRF protection  
**NFR-023:** API must implement rate limiting (100 req/min per user)  
**NFR-024:** Sensitive data must be encrypted at rest  

### 5.5 Maintainability
**NFR-025:** Code must follow Clean Architecture  
**NFR-026:** Code must follow SOLID principles  
**NFR-027:** Code coverage must be > 70%  
**NFR-028:** Code must pass linting standards  
**NFR-029:** API must be documented (Swagger/OpenAPI)  

### 5.6 Usability
**NFR-030:** Dashboard must be intuitive (no training required)  
**NFR-031:** Error messages must be user-friendly  
**NFR-032:** System must support Indonesian language UI  
**NFR-033:** Charts must be interactive and zoomable  

### 5.7 Compliance
**NFR-034:** System must only collect public data  
**NFR-035:** System must comply with platform ToS  
**NFR-036:** System must respect robots.txt  
**NFR-037:** System must log data collection activities  

---

## 6. DATA REQUIREMENTS

### 6.1 Data Collection Volume (Estimated)
- **Daily Posts:** 5,000 - 50,000 (during festival season)
- **Daily Authors:** 2,000 - 20,000
- **Storage Growth:** ~500MB - 2GB per day
- **Retention Period:** 12 months (configurable)

### 6.2 Data Points Per Post
- Platform (Instagram/TikTok/Facebook/Threads/X)
- Post ID (unique per platform)
- Author ID
- Author Name
- Author Username
- Author Follower Count
- Post Text
- Post Type (photo/video/text)
- Media URLs
- Posted At (timestamp)
- Collected At (timestamp)
- Likes Count
- Comments Count
- Shares Count
- Views Count (video only)
- Engagement Score (calculated)
- Sentiment (AI-classified)
- Language
- Location (if available)
- Hashtags (extracted)
- Mentions (extracted)

### 6.3 Data Quality
- Deduplicated (same post shared multiple times)
- Validated (schema enforcement)
- Normalized (consistent format across platforms)
- Enriched (sentiment, engagement scores)

---

## 7. TECHNICAL CONSTRAINTS

### 7.1 Platform-Specific Constraints
**Instagram:**
- Public posts only via unofficial APIs or web scraping
- Rate limiting varies
- No official data access

**TikTok:**
- Public videos only
- Geographic restrictions
- Frequent API changes

**Facebook:**
- Public pages only
- Graph API limitations
- Strict rate limiting

**Threads:**
- New platform, limited tooling
- Public threads only

**X (Twitter):**
- API v2 pricing tiers
- Rate limits per endpoint
- Requires API keys

### 7.2 Technical Decisions
- Use queue-based architecture for resilience
- Implement circuit breakers for external APIs
- Use caching extensively (Redis)
- Implement graceful degradation
- Design for eventual consistency

---

## 8. SUCCESS METRICS

### 8.1 Business Metrics
- **Data Coverage:** > 90% of public mentions captured
- **User Adoption:** 50+ active users within 3 months
- **Report Generation:** 100+ reports exported per month
- **Uptime:** 99.5% availability

### 8.2 Technical Metrics
- **Data Freshness:** < 15 minutes lag
- **Query Performance:** < 500ms API response
- **Worker Reliability:** < 1% failure rate
- **Sentiment Accuracy:** > 80% (validated sample)

### 8.3 User Satisfaction
- **Dashboard Load Time:** < 2 seconds
- **User Feedback Score:** > 4.0/5.0
- **Feature Adoption:** > 70% use top 5 features

---

## 9. ASSUMPTIONS

1. Social media platforms will maintain public data accessibility
2. Network connectivity is stable
3. Indonesian language sentiment models are available
4. Users have modern web browsers (Chrome/Firefox/Safari)
5. Festival Mbois will provide branding assets
6. Initial deployment supports desktop users primarily
7. Data retention of 12 months is sufficient
8. Platform ToS will not drastically change during development

---

## 10. DEPENDENCIES

### 10.1 External Dependencies
- Social media platform APIs/endpoints
- Cloud hosting provider (AWS/GCP/Azure)
- Domain and SSL certificates
- AI/ML sentiment analysis service
- Email service provider (for notifications)

### 10.2 Internal Dependencies
- Design assets (logos, brand guidelines)
- Test user accounts for validation
- Production environment credentials
- Initial keyword list approval

---

## 11. RISKS & MITIGATION

### 11.1 Technical Risks

**RISK-001: Platform API Changes**
- **Impact:** High
- **Probability:** High
- **Mitigation:** Modular worker design, monitoring, quick adaptation

**RISK-002: Rate Limiting**
- **Impact:** Medium
- **Probability:** High
- **Mitigation:** Respectful scraping, rate limit handling, exponential backoff

**RISK-003: Sentiment Analysis Accuracy**
- **Impact:** Medium
- **Probability:** Medium
- **Mitigation:** Use proven models, continuous validation, human review sample

**RISK-004: Data Volume Exceeds Estimates**
- **Impact:** High
- **Probability:** Medium
- **Mitigation:** Scalable architecture, database partitioning, archival strategy

**RISK-005: Worker Failures**
- **Impact:** Medium
- **Probability:** Medium
- **Mitigation:** Independent workers, auto-restart, health monitoring, alerts

### 11.2 Business Risks

**RISK-006: Legal/ToS Violations**
- **Impact:** High
- **Probability:** Low
- **Mitigation:** Legal review, public data only, respect robots.txt, compliance audit

**RISK-007: Data Privacy Concerns**
- **Impact:** High
- **Probability:** Low
- **Mitigation:** Public data only, clear privacy policy, no PII storage

**RISK-008: Insufficient Data Coverage**
- **Impact:** Medium
- **Probability:** Medium
- **Mitigation:** Multi-platform approach, keyword optimization, validation

---

## 12. FUTURE ENHANCEMENTS (Post-MVP)

### Phase 2 Features
- Mobile applications (iOS/Android)
- Advanced competitor analysis
- Automated alerting system
- Custom dashboard widgets
- Multi-event support
- Historical data import
- Advanced NLP (topic modeling, entity extraction)

### Phase 3 Features
- Predictive analytics
- Automated reporting schedules
- Integration with marketing tools
- White-label solution
- API marketplace
- Real-time crisis detection
- Multi-language support

---

## 13. APPROVAL SIGN-OFF

**Prepared By:** AI Architect  
**Review Required:**
- [ ] Product Owner
- [ ] Technical Lead
- [ ] Security Team
- [ ] Legal/Compliance
- [ ] Stakeholders

**Approval Status:** Pending Review

---

## 14. DOCUMENT HISTORY

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-07-23 | AI Architect | Initial draft |

