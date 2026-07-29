-- Festival Mbois Intelligence Platform
-- Database Schema Implementation
-- Version: 1.0
-- Date: 2026-07-24

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('admin', 'analyst', 'viewer');
CREATE TYPE platform_type AS ENUM ('instagram', 'tiktok', 'facebook', 'threads', 'twitter', 'website');
CREATE TYPE post_type AS ENUM ('post', 'reel', 'story', 'video', 'article');
CREATE TYPE sentiment_type AS ENUM ('positive', 'neutral', 'negative');
CREATE TYPE collection_status AS ENUM ('pending', 'running', 'completed', 'failed');

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'viewer',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- PLATFORMS
-- ============================================

CREATE TABLE platforms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type platform_type NOT NULL,
    is_active BOOLEAN DEFAULT true,
    config JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_platforms_type ON platforms(type);

-- ============================================
-- KEYWORDS
-- ============================================

CREATE TABLE keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keyword VARCHAR(255) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_keywords_active ON keywords(is_active);

-- ============================================
-- INFLUENCERS/ACCOUNTS
-- ============================================

CREATE TABLE influencers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform_id UUID REFERENCES platforms(id) ON DELETE CASCADE,
    platform_user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    profile_picture_url TEXT,
    bio TEXT,
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    posts_count INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,2) DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    metadata JSONB,
    last_scraped_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(platform_id, platform_user_id)
);

CREATE INDEX idx_influencers_platform ON influencers(platform_id);
CREATE INDEX idx_influencers_username ON influencers(username);
CREATE INDEX idx_influencers_engagement ON influencers(engagement_rate DESC);
CREATE INDEX idx_influencers_followers ON influencers(followers_count DESC);

-- ============================================
-- POSTS (Partitioned by month)
-- ============================================

CREATE TABLE posts (
    id UUID DEFAULT uuid_generate_v4(),
    platform_id UUID REFERENCES platforms(id) ON DELETE CASCADE,
    influencer_id UUID REFERENCES influencers(id) ON DELETE CASCADE,
    platform_post_id VARCHAR(255) NOT NULL,
    post_type post_type NOT NULL,
    content TEXT,
    media_urls TEXT[],
    post_url TEXT,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    engagement_score DECIMAL(10,2) DEFAULT 0,
    sentiment sentiment_type,
    sentiment_score DECIMAL(5,2),
    hashtags TEXT[],
    mentions TEXT[],
    location VARCHAR(255),
    posted_at TIMESTAMP NOT NULL,
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, posted_at)
) PARTITION BY RANGE (posted_at);

-- Create partitions for 2026
CREATE TABLE posts_2026_07 PARTITION OF posts
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE TABLE posts_2026_08 PARTITION OF posts
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

CREATE TABLE posts_2026_09 PARTITION OF posts
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

CREATE INDEX idx_posts_platform ON posts(platform_id);
CREATE INDEX idx_posts_influencer ON posts(influencer_id);
CREATE INDEX idx_posts_posted_at ON posts(posted_at DESC);
CREATE INDEX idx_posts_engagement ON posts(engagement_score DESC);
CREATE INDEX idx_posts_sentiment ON posts(sentiment);
CREATE INDEX idx_posts_hashtags ON posts USING GIN(hashtags);

-- ============================================
-- COMMENTS
-- ============================================

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL,
    platform_comment_id VARCHAR(255) NOT NULL,
    author_username VARCHAR(255),
    author_name VARCHAR(255),
    content TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    sentiment sentiment_type,
    sentiment_score DECIMAL(5,2),
    commented_at TIMESTAMP NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_sentiment ON comments(sentiment);
CREATE INDEX idx_comments_commented_at ON comments(commented_at DESC);

-- ============================================
-- HASHTAGS
-- ============================================

CREATE TABLE hashtags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hashtag VARCHAR(255) NOT NULL UNIQUE,
    usage_count INTEGER DEFAULT 0,
    first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_hashtags_usage ON hashtags(usage_count DESC);
CREATE INDEX idx_hashtags_last_seen ON hashtags(last_seen_at DESC);

-- ============================================
-- ANALYTICS AGGREGATIONS
-- ============================================

CREATE TABLE daily_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    platform_id UUID REFERENCES platforms(id) ON DELETE CASCADE,
    total_posts INTEGER DEFAULT 0,
    total_likes INTEGER DEFAULT 0,
    total_comments INTEGER DEFAULT 0,
    total_shares INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    avg_engagement_rate DECIMAL(5,2) DEFAULT 0,
    sentiment_positive_count INTEGER DEFAULT 0,
    sentiment_neutral_count INTEGER DEFAULT 0,
    sentiment_negative_count INTEGER DEFAULT 0,
    top_hashtags TEXT[],
    top_influencers JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, platform_id)
);

CREATE INDEX idx_daily_analytics_date ON daily_analytics(date DESC);
CREATE INDEX idx_daily_analytics_platform ON daily_analytics(platform_id);

-- ============================================
-- SCRAPING JOBS
-- ============================================

CREATE TABLE scraping_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform_id UUID REFERENCES platforms(id) ON DELETE CASCADE,
    status collection_status DEFAULT 'pending',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    posts_collected INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scraping_jobs_platform ON scraping_jobs(platform_id);
CREATE INDEX idx_scraping_jobs_status ON scraping_jobs(status);
CREATE INDEX idx_scraping_jobs_created ON scraping_jobs(created_at DESC);

-- ============================================
-- SYSTEM LOGS
-- ============================================

CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    context JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_created ON system_logs(created_at DESC);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platforms_updated_at BEFORE UPDATE ON platforms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_keywords_updated_at BEFORE UPDATE ON keywords
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_influencers_updated_at BEFORE UPDATE ON influencers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto calculate engagement score for posts
CREATE OR REPLACE FUNCTION calculate_engagement_score()
RETURNS TRIGGER AS $$
BEGIN
    NEW.engagement_score = (
        COALESCE(NEW.likes_count, 0) * 1.0 +
        COALESCE(NEW.comments_count, 0) * 2.0 +
        COALESCE(NEW.shares_count, 0) * 3.0 +
        COALESCE(NEW.views_count, 0) * 0.01
    );
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_posts_engagement BEFORE INSERT OR UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION calculate_engagement_score();

-- ============================================
-- VIEWS
-- ============================================

-- Top Influencers View
CREATE OR REPLACE VIEW v_top_influencers AS
SELECT 
    i.id,
    i.username,
    i.full_name,
    i.profile_picture_url,
    p.name as platform_name,
    p.type as platform_type,
    i.followers_count,
    i.posts_count,
    i.engagement_rate,
    COUNT(DISTINCT po.id) as total_posts,
    COALESCE(SUM(po.likes_count), 0) as total_likes,
    COALESCE(SUM(po.comments_count), 0) as total_comments,
    COALESCE(AVG(po.engagement_score), 0) as avg_engagement_score
FROM influencers i
JOIN platforms p ON i.platform_id = p.id
LEFT JOIN posts po ON i.id = po.influencer_id
WHERE i.is_active = true
GROUP BY i.id, i.username, i.full_name, i.profile_picture_url, 
         p.name, p.type, i.followers_count, i.posts_count, i.engagement_rate
ORDER BY avg_engagement_score DESC;

-- Top Posts View
CREATE OR REPLACE VIEW v_top_posts AS
SELECT 
    po.id,
    po.platform_post_id,
    po.content,
    po.post_url,
    po.engagement_score,
    po.likes_count,
    po.comments_count,
    po.shares_count,
    po.views_count,
    po.sentiment,
    po.posted_at,
    i.username as influencer_username,
    i.full_name as influencer_name,
    p.name as platform_name
FROM posts po
JOIN influencers i ON po.influencer_id = i.id
JOIN platforms p ON po.platform_id = p.id
ORDER BY po.engagement_score DESC;

-- Sentiment Summary View
CREATE OR REPLACE VIEW v_sentiment_summary AS
SELECT 
    p.name as platform_name,
    COUNT(*) FILTER (WHERE po.sentiment = 'positive') as positive_count,
    COUNT(*) FILTER (WHERE po.sentiment = 'neutral') as neutral_count,
    COUNT(*) FILTER (WHERE po.sentiment = 'negative') as negative_count,
    ROUND(AVG(CASE WHEN po.sentiment = 'positive' THEN 100 
                   WHEN po.sentiment = 'neutral' THEN 50 
                   ELSE 0 END), 2) as sentiment_score
FROM posts po
JOIN platforms p ON po.platform_id = p.id
GROUP BY p.name;

-- ============================================
-- SEED DATA
-- ============================================

-- Insert default platforms
INSERT INTO platforms (name, type, is_active, config) VALUES
('Instagram', 'instagram', true, '{"base_url": "https://www.instagram.com"}'),
('TikTok', 'tiktok', true, '{"base_url": "https://www.tiktok.com"}'),
('Facebook', 'facebook', true, '{"base_url": "https://www.facebook.com"}'),
('Twitter/X', 'twitter', true, '{"base_url": "https://twitter.com"}'),
('Threads', 'threads', true, '{"base_url": "https://www.threads.net"}'),
('Website', 'website', true, '{"base_url": ""}');

-- Insert default keywords
INSERT INTO keywords (keyword, is_active, priority) VALUES
('festival mbois', true, 1),
('mbois', true, 1),
('#festivalmbois', true, 2),
('#mbois', true, 2),
('mbois festival', true, 1);

-- Insert default admin user (password: admin123 - hashed with bcrypt)
-- Note: Change this in production!
INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES
('admin@festivalmbois.com', '$2b$10$JS7lxg2W1AK1y25qaqXvEeb3A1re.P5oe0RO3PLuB/f0NqB7uJIPu', 'Administrator', 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE users IS 'User accounts with role-based access control';
COMMENT ON TABLE platforms IS 'Social media platforms being monitored';
COMMENT ON TABLE keywords IS 'Keywords to track across platforms';
COMMENT ON TABLE influencers IS 'Social media accounts/influencers';
COMMENT ON TABLE posts IS 'Posts collected from platforms (partitioned by month)';
COMMENT ON TABLE comments IS 'Comments on posts';
COMMENT ON TABLE hashtags IS 'Trending hashtags tracking';
COMMENT ON TABLE daily_analytics IS 'Daily aggregated analytics data';
COMMENT ON TABLE scraping_jobs IS 'Scraping job tracking and status';
COMMENT ON TABLE system_logs IS 'System-wide logging';

-- ============================================
-- GRANTS (adjust according to your needs)
-- ============================================

-- Grant privileges to application user (create this user separately)
-- CREATE USER mbois_app WITH PASSWORD 'your_secure_password';
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mbois_app;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mbois_app;

