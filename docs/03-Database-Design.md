# Database Design Document
# Festival Mbois Intelligence Platform

**Version:** 1.0
**Date:** July 23, 2026
**Status:** Draft for Approval

---

## 1. DATABASE OVERVIEW

### 1.1 Purpose
This document provides detailed database schema design for the Festival Mbois Intelligence Platform, including tables, relationships, indexes, partitioning strategy, and data normalization.

### 1.2 Database Technology
**Primary Database:** PostgreSQL 15+

**Justification:**
- ACID compliance for data integrity
- Advanced JSON support (JSONB)
- Full-text search capabilities
- Table partitioning support
- Mature replication and backup tools
- Strong community and enterprise support

### 1.3 Design Principles
- **Normalized to 3NF:** Minimize redundancy
- **Referential Integrity:** Foreign key constraints
- **Scalability:** Partitioning for large tables
- **Performance:** Strategic indexing
- **Flexibility:** JSONB for semi-structured data
- **Audit Trail:** Timestamps on all tables

---

## 2. DATABASE ARCHITECTURE

### 2.1 Database Instances
- **Primary (Master):** Read/Write operations
- **Replica 1:** Read operations (analytics queries)
- **Replica 2:** Read operations (dashboard queries)

### 2.2 Schema Organization

`
festival_mbois_db
├── public (default schema)
│   ├── users
│   ├── roles
│   ├── audit_logs
│   ├── keywords
│   └── system_config
├── social (social media data)
│   ├── posts
│   ├── authors
│   ├── hashtags
│   ├── post_hashtags
│   ├── mentions
│   └── post_mentions
└── analytics (aggregated data)
    ├── metrics_daily
    ├── metrics_hourly
    ├── trending_keywords
    └── trending_hashtags
`

---

## 3. ENTITY RELATIONSHIP DIAGRAM

`
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│    users    │────────▶│  audit_logs  │         │   keywords  │
└─────────────┘         └──────────────┘         └─────────────┘
                                                         │
                                                         │ (tracks)
                                                         ▼
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   authors   │◀────────│    posts     │────────▶│  hashtags   │
└─────────────┘         └──────────────┘         └─────────────┘
      │                        │                         │
      │                        │                         │
      │                        ▼                         ▼
      │                 ┌──────────────┐         ┌──────────────┐
      │                 │post_mentions │         │post_hashtags │
      │                 └──────────────┘         └──────────────┘
      │
      ▼
┌─────────────┐
│metrics_daily│
└─────────────┘
`

---

## 4. TABLE SCHEMAS

### 4.1 User Management Tables

#### 4.1.1 users
**Purpose:** Store user accounts and authentication data

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique user identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email (login) |
| password_hash | VARCHAR(255) | NOT NULL | Bcrypt hashed password |
| first_name | VARCHAR(100) | NOT NULL | User first name |
| last_name | VARCHAR(100) | NOT NULL | User last name |
| role | ENUM | NOT NULL | admin, analyst, viewer |
| is_active | BOOLEAN | DEFAULT TRUE | Account status |
| last_login_at | TIMESTAMP | NULL | Last successful login |
| created_at | TIMESTAMP | DEFAULT NOW() | Account creation |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update |

**Indexes:**
- PRIMARY KEY (id)
- UNIQUE INDEX (email)
- INDEX (role, is_active)

**SQL:**
`sql
CREATE TYPE user_role AS ENUM ('admin', 'analyst', 'viewer');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_role_active ON users(role, is_active);
`

#### 4.1.2 audit_logs
**Purpose:** Track user actions for security and compliance

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Log entry ID |
| user_id | UUID | FK → users.id | User who performed action |
| action | VARCHAR(100) | NOT NULL | Action type (login, export, etc) |
| resource_type | VARCHAR(50) | NULL | Resource affected (post, user, etc) |
| resource_id | VARCHAR(100) | NULL | ID of affected resource |
| ip_address | INET | NOT NULL | User IP address |
| user_agent | TEXT | NULL | Browser/client info |
| metadata | JSONB | NULL | Additional context |
| created_at | TIMESTAMP | DEFAULT NOW() | When action occurred |

**Indexes:**
- PRIMARY KEY (id)
- INDEX (user_id, created_at DESC)
- INDEX (action, created_at DESC)
- GIN INDEX (metadata)

**SQL:**
`sql
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(100),
    ip_address INET NOT NULL,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_time ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_action_time ON audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_logs_metadata ON audit_logs USING GIN(metadata);
`

### 4.2 Social Media Data Tables

#### 4.2.1 authors
**Purpose:** Store social media profile information

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Internal author ID |
| platform | ENUM | NOT NULL | instagram, tiktok, facebook, threads, x |
| platform_user_id | VARCHAR(100) | NOT NULL | Platform's user ID |
| username | VARCHAR(255) | NOT NULL | @username or handle |
| display_name | VARCHAR(255) | NOT NULL | Display name |
| bio | TEXT | NULL | Profile bio/description |
| follower_count | INTEGER | DEFAULT 0 | Follower/subscriber count |
| following_count | INTEGER | DEFAULT 0 | Following count |
| post_count | INTEGER | DEFAULT 0 | Total posts by author |
| profile_url | VARCHAR(500) | NOT NULL | Link to profile |
| profile_image_url | VARCHAR(500) | NULL | Avatar/profile pic URL |
| is_verified | BOOLEAN | DEFAULT FALSE | Verified/official account |
| location | VARCHAR(255) | NULL | Location if available |
| created_at | TIMESTAMP | DEFAULT NOW() | First seen |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last profile update |

**Indexes:**
- PRIMARY KEY (id)
- UNIQUE INDEX (platform, platform_user_id)
- INDEX (platform, follower_count DESC)
- INDEX (username)

**SQL:**
`sql
CREATE TYPE social_platform AS ENUM ('instagram', 'tiktok', 'facebook', 'threads', 'x');

CREATE TABLE authors (
    id BIGSERIAL PRIMARY KEY,
    platform social_platform NOT NULL,
    platform_user_id VARCHAR(100) NOT NULL,
    username VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    bio TEXT,
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    profile_url VARCHAR(500) NOT NULL,
    profile_image_url VARCHAR(500),
    is_verified BOOLEAN DEFAULT FALSE,
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(platform, platform_user_id)
);

CREATE INDEX idx_authors_platform_followers ON authors(platform, follower_count DESC);
CREATE INDEX idx_authors_username ON authors(username);
`


#### 4.2.2 posts
**Purpose:** Store social media posts (main data table)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Internal post ID |
| platform | ENUM | NOT NULL | instagram, tiktok, facebook, threads, x |
| platform_post_id | VARCHAR(100) | NOT NULL | Platform's post ID |
| author_id | BIGINT | FK → authors.id | Post author |
| post_type | ENUM | NOT NULL | photo, video, text, carousel |
| text | TEXT | NULL | Post caption/text |
| language | VARCHAR(10) | DEFAULT 'id' | Language code (id=Indonesian) |
| media_urls | JSONB | NULL | Array of media URLs |
| post_url | VARCHAR(500) | NOT NULL | Link to original post |
| posted_at | TIMESTAMP | NOT NULL | When post was published |
| collected_at | TIMESTAMP | DEFAULT NOW() | When we collected it |
| likes_count | INTEGER | DEFAULT 0 | Like/heart count |
| comments_count | INTEGER | DEFAULT 0 | Comment count |
| shares_count | INTEGER | DEFAULT 0 | Share/retweet count |
| views_count | BIGINT | DEFAULT 0 | Video view count |
| engagement_score | DECIMAL(10,2) | DEFAULT 0 | Calculated engagement |
| sentiment | ENUM | NULL | positive, neutral, negative |
| sentiment_confidence | DECIMAL(5,4) | NULL | Sentiment confidence (0-1) |
| location | VARCHAR(255) | NULL | Post location if available |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft delete flag |
| raw_data | JSONB | NULL | Original platform response |
| created_at | TIMESTAMP | DEFAULT NOW() | Record created |
| updated_at | TIMESTAMP | DEFAULT NOW() | Record updated |

**Partitioning:** Monthly partitions by posted_at

**Indexes:**
- PRIMARY KEY (id)
- UNIQUE INDEX (platform, platform_post_id)
- INDEX (author_id, posted_at DESC)
- INDEX (platform, posted_at DESC)
- INDEX (sentiment, posted_at DESC)
- INDEX (engagement_score DESC)
- FULL TEXT INDEX (text)
- GIN INDEX (media_urls)

**SQL:**
`sql
CREATE TYPE post_type AS ENUM ('photo', 'video', 'text', 'carousel');
CREATE TYPE sentiment_type AS ENUM ('positive', 'neutral', 'negative');

CREATE TABLE posts (
    id BIGSERIAL,
    platform social_platform NOT NULL,
    platform_post_id VARCHAR(100) NOT NULL,
    author_id BIGINT REFERENCES authors(id) ON DELETE CASCADE,
    post_type post_type NOT NULL,
    text TEXT,
    language VARCHAR(10) DEFAULT 'id',
    media_urls JSONB,
    post_url VARCHAR(500) NOT NULL,
    posted_at TIMESTAMP NOT NULL,
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    views_count BIGINT DEFAULT 0,
    engagement_score DECIMAL(10,2) DEFAULT 0,
    sentiment sentiment_type,
    sentiment_confidence DECIMAL(5,4),
    location VARCHAR(255),
    is_deleted BOOLEAN DEFAULT FALSE,
    raw_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, posted_at)
) PARTITION BY RANGE (posted_at);

-- Create monthly partitions (example for July 2026)
CREATE TABLE posts_2026_07 PARTITION OF posts
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE TABLE posts_2026_08 PARTITION OF posts
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

-- Indexes on main table (inherited by partitions)
CREATE UNIQUE INDEX idx_posts_platform_id ON posts(platform, platform_post_id);
CREATE INDEX idx_posts_author_time ON posts(author_id, posted_at DESC);
CREATE INDEX idx_posts_platform_time ON posts(platform, posted_at DESC);
CREATE INDEX idx_posts_sentiment_time ON posts(sentiment, posted_at DESC);
CREATE INDEX idx_posts_engagement ON posts(engagement_score DESC);
CREATE INDEX idx_posts_text_search ON posts USING GIN(to_tsvector('indonesian', text));
CREATE INDEX idx_posts_media_urls ON posts USING GIN(media_urls);
`

#### 4.2.3 hashtags
**Purpose:** Store unique hashtags

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Hashtag ID |
| tag | VARCHAR(255) | UNIQUE, NOT NULL | Hashtag text (without #) |
| normalized_tag | VARCHAR(255) | NOT NULL | Lowercase normalized |
| first_seen_at | TIMESTAMP | DEFAULT NOW() | First occurrence |
| post_count | INTEGER | DEFAULT 0 | Number of posts using this tag |
| created_at | TIMESTAMP | DEFAULT NOW() | Record created |
| updated_at | TIMESTAMP | DEFAULT NOW() | Record updated |

**Indexes:**
- PRIMARY KEY (id)
- UNIQUE INDEX (tag)
- INDEX (normalized_tag)
- INDEX (post_count DESC)

**SQL:**
`sql
CREATE TABLE hashtags (
    id BIGSERIAL PRIMARY KEY,
    tag VARCHAR(255) UNIQUE NOT NULL,
    normalized_tag VARCHAR(255) NOT NULL,
    first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    post_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_hashtags_normalized ON hashtags(normalized_tag);
CREATE INDEX idx_hashtags_post_count ON hashtags(post_count DESC);
`

#### 4.2.4 post_hashtags
**Purpose:** Many-to-many relationship between posts and hashtags

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| post_id | BIGINT | FK → posts.id | Post ID |
| hashtag_id | BIGINT | FK → hashtags.id | Hashtag ID |
| created_at | TIMESTAMP | DEFAULT NOW() | When linked |

**Indexes:**
- PRIMARY KEY (post_id, hashtag_id)
- INDEX (hashtag_id, post_id)

**SQL:**
`sql
CREATE TABLE post_hashtags (
    post_id BIGINT NOT NULL,
    hashtag_id BIGINT REFERENCES hashtags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, hashtag_id)
);

CREATE INDEX idx_post_hashtags_hashtag ON post_hashtags(hashtag_id, post_id);
`

#### 4.2.5 mentions
**Purpose:** Store @mentions found in posts

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Mention ID |
| username | VARCHAR(255) | NOT NULL | Mentioned username |
| platform | ENUM | NOT NULL | Platform where mentioned |
| first_seen_at | TIMESTAMP | DEFAULT NOW() | First occurrence |
| mention_count | INTEGER | DEFAULT 0 | Number of mentions |
| created_at | TIMESTAMP | DEFAULT NOW() | Record created |
| updated_at | TIMESTAMP | DEFAULT NOW() | Record updated |

**Indexes:**
- PRIMARY KEY (id)
- INDEX (username, platform)

**SQL:**
`sql
CREATE TABLE mentions (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    platform social_platform NOT NULL,
    first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    mention_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mentions_username_platform ON mentions(username, platform);
`

#### 4.2.6 post_mentions
**Purpose:** Many-to-many relationship between posts and mentions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| post_id | BIGINT | FK → posts.id | Post ID |
| mention_id | BIGINT | FK → mentions.id | Mention ID |
| created_at | TIMESTAMP | DEFAULT NOW() | When linked |

**Indexes:**
- PRIMARY KEY (post_id, mention_id)
- INDEX (mention_id, post_id)

**SQL:**
`sql
CREATE TABLE post_mentions (
    post_id BIGINT NOT NULL,
    mention_id BIGINT REFERENCES mentions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, mention_id)
);

CREATE INDEX idx_post_mentions_mention ON post_mentions(mention_id, post_id);
`

### 4.3 Keyword Management

#### 4.3.1 keywords
**Purpose:** Store tracked keywords

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Keyword ID |
| keyword | VARCHAR(255) | UNIQUE, NOT NULL | Keyword text |
| normalized_keyword | VARCHAR(255) | NOT NULL | Lowercase normalized |
| is_active | BOOLEAN | DEFAULT TRUE | Track this keyword? |
| created_by | UUID | FK → users.id | User who added it |
| created_at | TIMESTAMP | DEFAULT NOW() | When added |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last modified |

**Indexes:**
- PRIMARY KEY (id)
- UNIQUE INDEX (keyword)
- INDEX (is_active)

**SQL:**
`sql
CREATE TABLE keywords (
    id BIGSERIAL PRIMARY KEY,
    keyword VARCHAR(255) UNIQUE NOT NULL,
    normalized_keyword VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_keywords_active ON keywords(is_active);
`


### 4.4 Analytics Tables

#### 4.4.1 metrics_daily
**Purpose:** Pre-aggregated daily metrics for fast dashboard queries

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Metric ID |
| date | DATE | NOT NULL | Metric date |
| platform | ENUM | NULL | Specific platform (NULL = all) |
| total_posts | INTEGER | DEFAULT 0 | Posts that day |
| total_authors | INTEGER | DEFAULT 0 | Unique authors |
| total_likes | BIGINT | DEFAULT 0 | Total likes |
| total_comments | BIGINT | DEFAULT 0 | Total comments |
| total_shares | BIGINT | DEFAULT 0 | Total shares |
| total_views | BIGINT | DEFAULT 0 | Total views |
| total_engagement | BIGINT | DEFAULT 0 | Total engagement |
| total_reach | BIGINT | DEFAULT 0 | Estimated reach |
| sentiment_positive | INTEGER | DEFAULT 0 | Positive posts |
| sentiment_neutral | INTEGER | DEFAULT 0 | Neutral posts |
| sentiment_negative | INTEGER | DEFAULT 0 | Negative posts |
| avg_engagement_rate | DECIMAL(5,4) | DEFAULT 0 | Avg engagement % |
| created_at | TIMESTAMP | DEFAULT NOW() | Record created |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last updated |

**Indexes:**
- PRIMARY KEY (id)
- UNIQUE INDEX (date, platform)
- INDEX (date DESC)

**SQL:**
`sql
CREATE TABLE metrics_daily (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    platform social_platform,
    total_posts INTEGER DEFAULT 0,
    total_authors INTEGER DEFAULT 0,
    total_likes BIGINT DEFAULT 0,
    total_comments BIGINT DEFAULT 0,
    total_shares BIGINT DEFAULT 0,
    total_views BIGINT DEFAULT 0,
    total_engagement BIGINT DEFAULT 0,
    total_reach BIGINT DEFAULT 0,
    sentiment_positive INTEGER DEFAULT 0,
    sentiment_neutral INTEGER DEFAULT 0,
    sentiment_negative INTEGER DEFAULT 0,
    avg_engagement_rate DECIMAL(5,4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, platform)
);

CREATE INDEX idx_metrics_daily_date ON metrics_daily(date DESC);
`

#### 4.4.2 metrics_hourly
**Purpose:** Hourly metrics for granular analysis

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Metric ID |
| hour | TIMESTAMP | NOT NULL | Hour timestamp (truncated) |
| platform | ENUM | NULL | Specific platform (NULL = all) |
| total_posts | INTEGER | DEFAULT 0 | Posts in that hour |
| total_engagement | BIGINT | DEFAULT 0 | Total engagement |
| created_at | TIMESTAMP | DEFAULT NOW() | Record created |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last updated |

**Indexes:**
- PRIMARY KEY (id)
- UNIQUE INDEX (hour, platform)
- INDEX (hour DESC)

**SQL:**
`sql
CREATE TABLE metrics_hourly (
    id BIGSERIAL PRIMARY KEY,
    hour TIMESTAMP NOT NULL,
    platform social_platform,
    total_posts INTEGER DEFAULT 0,
    total_engagement BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hour, platform)
);

CREATE INDEX idx_metrics_hourly_hour ON metrics_hourly(hour DESC);
`

#### 4.4.3 trending_keywords
**Purpose:** Track trending keywords over time

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Trend ID |
| keyword | VARCHAR(255) | NOT NULL | Trending keyword |
| date | DATE | NOT NULL | Trend date |
| mention_count | INTEGER | DEFAULT 0 | Mentions today |
| velocity | DECIMAL(10,2) | DEFAULT 0 | Growth rate |
| rank | INTEGER | NULL | Rank (1-N) |
| created_at | TIMESTAMP | DEFAULT NOW() | Record created |

**Indexes:**
- PRIMARY KEY (id)
- INDEX (date DESC, rank)

**SQL:**
`sql
CREATE TABLE trending_keywords (
    id BIGSERIAL PRIMARY KEY,
    keyword VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    mention_count INTEGER DEFAULT 0,
    velocity DECIMAL(10,2) DEFAULT 0,
    rank INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_trending_keywords_date_rank ON trending_keywords(date DESC, rank);
`

#### 4.4.4 trending_hashtags
**Purpose:** Track trending hashtags over time

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Trend ID |
| hashtag_id | BIGINT | FK → hashtags.id | Hashtag reference |
| date | DATE | NOT NULL | Trend date |
| mention_count | INTEGER | DEFAULT 0 | Mentions today |
| velocity | DECIMAL(10,2) | DEFAULT 0 | Growth rate |
| rank | INTEGER | NULL | Rank (1-N) |
| created_at | TIMESTAMP | DEFAULT NOW() | Record created |

**Indexes:**
- PRIMARY KEY (id)
- INDEX (date DESC, rank)
- INDEX (hashtag_id, date DESC)

**SQL:**
`sql
CREATE TABLE trending_hashtags (
    id BIGSERIAL PRIMARY KEY,
    hashtag_id BIGINT REFERENCES hashtags(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    mention_count INTEGER DEFAULT 0,
    velocity DECIMAL(10,2) DEFAULT 0,
    rank INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_trending_hashtags_date_rank ON trending_hashtags(date DESC, rank);
CREATE INDEX idx_trending_hashtags_hashtag_date ON trending_hashtags(hashtag_id, date DESC);
`

### 4.5 System Tables

#### 4.5.1 system_config
**Purpose:** Store system-wide configuration

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| key | VARCHAR(100) | PRIMARY KEY | Config key |
| value | TEXT | NOT NULL | Config value |
| description | TEXT | NULL | Config description |
| created_at | TIMESTAMP | DEFAULT NOW() | Record created |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last updated |

**SQL:**
`sql
CREATE TABLE system_config (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`

---

## 5. RELATIONSHIPS & CONSTRAINTS

### 5.1 Foreign Key Relationships

`
users (1) ────────> (*) audit_logs
users (1) ────────> (*) keywords

authors (1) ───────> (*) posts

posts (*) ────────> (*) hashtags (via post_hashtags)
posts (*) ────────> (*) mentions (via post_mentions)

hashtags (1) ──────> (*) trending_hashtags
`

### 5.2 Cascade Rules

| Parent | Child | On Delete |
|--------|-------|-----------|
| users | audit_logs | SET NULL |
| users | keywords | SET NULL |
| authors | posts | CASCADE |
| hashtags | post_hashtags | CASCADE |
| mentions | post_mentions | CASCADE |
| hashtags | trending_hashtags | CASCADE |

---

## 6. INDEXES STRATEGY

### 6.1 Index Types Used

| Index Type | Use Case | Tables |
|------------|----------|--------|
| B-tree | Primary keys, foreign keys, sorting | All tables |
| GIN | JSONB columns, full-text search | posts, audit_logs |
| Unique | Enforce uniqueness | users.email, posts(platform, platform_post_id) |

### 6.2 Index Maintenance

**Strategy:**
- Weekly VACUUM ANALYZE on large tables
- Monthly REINDEX on fragmented indexes
- Monitor index bloat with pg_stat_user_indexes
- Drop unused indexes (pg_stat_user_indexes.idx_scan = 0)

---

## 7. PARTITIONING STRATEGY

### 7.1 Posts Table Partitioning

**Method:** Range partitioning by posted_at (monthly)

**Rationale:**
- Posts table will be largest (millions of rows)
- Most queries filter by date range
- Easy to drop old partitions (archival)
- Improves query performance

**Partition Management:**
`sql
-- Create new partition (run monthly)
CREATE TABLE posts_2026_09 PARTITION OF posts
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

-- Drop old partition after archival (after 12 months)
DROP TABLE posts_2025_07;
`

### 7.2 Future Partitioning Candidates
- metrics_daily (yearly partitions)
- audit_logs (monthly partitions)

---

## 8. DATA TYPES & JUSTIFICATION

| Data Type | Use Case | Justification |
|-----------|----------|---------------|
| UUID | User IDs | Distributed ID generation, security |
| BIGSERIAL | Post IDs, large tables | Support for billions of rows |
| SERIAL | Small lookup tables | Sufficient for millions of rows |
| VARCHAR | Text fields with limit | Performance, validation |
| TEXT | Unlimited text | Post content, bios |
| JSONB | Semi-structured data | Flexibility, indexable |
| ENUM | Fixed choices | Type safety, storage efficiency |
| TIMESTAMP | Date/time | Timezone aware, precision |
| INET | IP addresses | Built-in validation, functions |
| DECIMAL | Money, percentages | Exact arithmetic |

---

## 9. CALCULATED FIELDS

### 9.1 engagement_score (posts table)

**Formula:**
`sql
engagement_score = (likes_count * 1.0) + 
                   (comments_count * 2.0) + 
                   (shares_count * 3.0) +
                   (views_count * 0.01)
`

**Rationale:**
- Comments worth 2x likes (more effort)
- Shares worth 3x likes (highest intent)
- Views worth 0.01x (lowest intent, high volume)

**Implementation:** Trigger or application-level calculation

### 9.2 total_reach (metrics_daily)

**Formula:**
`sql
total_reach = SUM(DISTINCT author.follower_count)
`

**Rationale:** Estimated unique users who could see the content

### 9.3 avg_engagement_rate (metrics_daily)

**Formula:**
`sql
avg_engagement_rate = (total_engagement / total_reach) * 100
`

**Rationale:** Industry-standard engagement metric

---

## 10. TRIGGERS & FUNCTIONS

### 10.1 updated_at Trigger

**Purpose:** Automatically update updated_at timestamp

`sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS \$\$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
\$\$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Repeat for other tables...
`

### 10.2 engagement_score Trigger

**Purpose:** Calculate engagement_score on insert/update

`sql
CREATE OR REPLACE FUNCTION calculate_engagement_score()
RETURNS TRIGGER AS \$\$
BEGIN
    NEW.engagement_score = (NEW.likes_count * 1.0) + 
                           (NEW.comments_count * 2.0) + 
                           (NEW.shares_count * 3.0) +
                           (NEW.views_count * 0.01);
    RETURN NEW;
END;
\$\$ LANGUAGE plpgsql;

CREATE TRIGGER update_post_engagement
    BEFORE INSERT OR UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION calculate_engagement_score();
`

### 10.3 hashtag_count Trigger

**Purpose:** Maintain hashtags.post_count

`sql
CREATE OR REPLACE FUNCTION update_hashtag_count()
RETURNS TRIGGER AS \$\$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE hashtags SET post_count = post_count + 1
        WHERE id = NEW.hashtag_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE hashtags SET post_count = post_count - 1
        WHERE id = OLD.hashtag_id;
    END IF;
    RETURN NULL;
END;
\$\$ LANGUAGE plpgsql;

CREATE TRIGGER update_hashtag_count_trigger
    AFTER INSERT OR DELETE ON post_hashtags
    FOR EACH ROW
    EXECUTE FUNCTION update_hashtag_count();
`

---

## 11. VIEWS

### 11.1 v_top_influencers

**Purpose:** Pre-joined view for top influencers

`sql
CREATE VIEW v_top_influencers AS
SELECT 
    a.id,
    a.platform,
    a.username,
    a.display_name,
    a.follower_count,
    a.is_verified,
    COUNT(DISTINCT p.id) as post_count,
    SUM(p.engagement_score) as total_engagement,
    AVG(p.engagement_score) as avg_engagement_per_post
FROM authors a
LEFT JOIN posts p ON p.author_id = a.id
WHERE p.is_deleted = FALSE
GROUP BY a.id
ORDER BY a.follower_count DESC;
`

### 11.2 v_top_posts

**Purpose:** Top posts with author info

`sql
CREATE VIEW v_top_posts AS
SELECT 
    p.id,
    p.platform,
    p.post_type,
    p.text,
    p.post_url,
    p.posted_at,
    p.engagement_score,
    p.sentiment,
    p.likes_count,
    p.comments_count,
    p.shares_count,
    p.views_count,
    a.username,
    a.display_name,
    a.follower_count,
    a.profile_image_url
FROM posts p
INNER JOIN authors a ON p.author_id = a.id
WHERE p.is_deleted = FALSE
ORDER BY p.engagement_score DESC;
`

### 11.3 v_platform_distribution

**Purpose:** Posts by platform

`sql
CREATE VIEW v_platform_distribution AS
SELECT 
    platform,
    COUNT(*) as total_posts,
    SUM(engagement_score) as total_engagement,
    SUM(likes_count) as total_likes,
    SUM(comments_count) as total_comments,
    SUM(shares_count) as total_shares,
    SUM(views_count) as total_views
FROM posts
WHERE is_deleted = FALSE
GROUP BY platform;
`

---

## 12. DATABASE SECURITY

### 12.1 User Roles

`sql
-- Application user (read/write)
CREATE ROLE app_user WITH LOGIN PASSWORD 'secure_password';
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Read-only analytics user
CREATE ROLE analytics_user WITH LOGIN PASSWORD 'secure_password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_user;

-- Admin user
CREATE ROLE admin_user WITH LOGIN PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin_user;
`

### 12.2 Row-Level Security (Future)

**Enable for multi-tenant support:**
`sql
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_posts_policy ON posts
    FOR SELECT
    USING (true); -- All users can see all posts (current requirement)
`

### 12.3 Sensitive Data Protection

- Password hashes only (never plain text)
- Audit logs for all data access
- Encryption at rest (database-level)
- SSL/TLS for connections

---

## 13. BACKUP & RECOVERY

### 13.1 Backup Strategy

**Full Backup:** Daily at 2 AM (low traffic)
`ash
pg_dump -Fc festival_mbois_db > backup_\.dump
`

**Incremental Backup:** Continuous WAL archiving
`
archive_mode = on
archive_command = 'cp %p /backup/wal/%f'
`

**Retention:** 30 days

### 13.2 Recovery Procedures

**Point-in-Time Recovery:**
`ash
pg_restore -d festival_mbois_db backup_20260723.dump
`

**Recovery Time Objective (RTO):** 4 hours
**Recovery Point Objective (RPO):** 24 hours

---

## 14. PERFORMANCE OPTIMIZATION

### 14.1 Query Optimization

**Analyze slow queries:**
`sql
-- Enable slow query logging
ALTER DATABASE festival_mbois_db SET log_min_duration_statement = 1000; -- 1 second

-- Find slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
`

### 14.2 Connection Pooling

**Recommended:** PgBouncer
- Pool size: 100 connections
- Max client connections: 1000

### 14.3 Vacuum & Maintenance

`sql
-- Regular vacuum
VACUUM ANALYZE posts;

-- Monitor bloat
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
`

---

## 15. SAMPLE QUERIES

### 15.1 Dashboard Overview

`sql
-- Get overall metrics for last 30 days
SELECT 
    COUNT(DISTINCT id) as total_posts,
    COUNT(DISTINCT author_id) as total_authors,
    SUM(likes_count) as total_likes,
    SUM(comments_count) as total_comments,
    SUM(shares_count) as total_shares,
    SUM(views_count) as total_views,
    SUM(engagement_score) as total_engagement,
    COUNT(DISTINCT author_id) * AVG(follower_count) as estimated_reach
FROM posts p
JOIN authors a ON p.author_id = a.id
WHERE p.posted_at >= NOW() - INTERVAL '30 days'
  AND p.is_deleted = FALSE;
`

### 15.2 Top Influencers

`sql
SELECT 
    a.username,
    a.display_name,
    a.follower_count,
    a.platform,
    COUNT(p.id) as post_count,
    SUM(p.engagement_score) as total_engagement
FROM authors a
JOIN posts p ON p.author_id = a.id
WHERE p.posted_at >= NOW() - INTERVAL '30 days'
  AND p.is_deleted = FALSE
GROUP BY a.id
ORDER BY a.follower_count DESC
LIMIT 10;
`

### 15.3 Trending Hashtags

`sql
SELECT 
    h.tag,
    COUNT(ph.post_id) as mention_count,
    SUM(p.engagement_score) as total_engagement
FROM hashtags h
JOIN post_hashtags ph ON ph.hashtag_id = h.id
JOIN posts p ON p.id = ph.post_id
WHERE p.posted_at >= NOW() - INTERVAL '24 hours'
  AND p.is_deleted = FALSE
GROUP BY h.id
ORDER BY mention_count DESC
LIMIT 10;
`

### 15.4 Sentiment Distribution

`sql
SELECT 
    sentiment,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM posts
WHERE posted_at >= NOW() - INTERVAL '30 days'
  AND is_deleted = FALSE
  AND sentiment IS NOT NULL
GROUP BY sentiment;
`

### 15.5 Daily Growth

`sql
SELECT 
    DATE(posted_at) as date,
    COUNT(*) as posts_count,
    SUM(engagement_score) as total_engagement
FROM posts
WHERE posted_at >= NOW() - INTERVAL '30 days'
  AND is_deleted = FALSE
GROUP BY DATE(posted_at)
ORDER BY date DESC;
`

---

## 16. DATA MIGRATION

### 16.1 Initial Schema Setup

`ash
# Run migration scripts in order
psql -U postgres -d festival_mbois_db -f 001_create_enums.sql
psql -U postgres -d festival_mbois_db -f 002_create_tables.sql
psql -U postgres -d festival_mbois_db -f 003_create_indexes.sql
psql -U postgres -d festival_mbois_db -f 004_create_triggers.sql
psql -U postgres -d festival_mbois_db -f 005_create_views.sql
psql -U postgres -d festival_mbois_db -f 006_seed_data.sql
`

### 16.2 Seed Data

`sql
-- Insert default admin user
INSERT INTO users (email, password_hash, first_name, last_name, role)
VALUES ('admin@festivalmbois.com', '\\\...', 'Admin', 'User', 'admin');

-- Insert default keywords
INSERT INTO keywords (keyword, normalized_keyword)
VALUES 
    ('Festival Mbois', 'festival mbois'),
    ('Festival Mbois 11', 'festival mbois 11'),
    ('#mbois11', '#mbois11'),
    ('#festivalmbois11', '#festivalmbois11'),
    ('Festival Mbois Malang', 'festival mbois malang'),
    ('Festival Mbois 2026', 'festival mbois 2026');
`

---

## 17. APPROVAL & NEXT STEPS

### 17.1 Review Checklist
- [ ] Schema normalized (3NF)
- [ ] Indexes optimized for queries
- [ ] Partitioning strategy approved
- [ ] Security policies reviewed
- [ ] Backup strategy confirmed
- [ ] Migration scripts prepared

### 17.2 Estimated Database Size

**Year 1 Projections:**
- Posts: 10M rows × 5KB = 50GB
- Authors: 500K rows × 2KB = 1GB
- Hashtags: 100K rows × 500B = 50MB
- Indexes: ~30% overhead = 15GB
- **Total: ~66GB + growth**

### 17.3 Next Documents
1. ✅ PRD
2. ✅ System Design
3. ✅ Database Design (this document)
4. ⏭️ API Design & Documentation
5. ⏭️ Frontend Architecture
6. ⏭️ Development Roadmap

---

**Document Status:** Ready for Review  
**Next Action:** API Design Document

