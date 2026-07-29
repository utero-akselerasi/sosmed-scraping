export default () => ({
  app: {
    name: process.env.APP_NAME || 'Festival Mbois Intelligence Platform',
    port: parseInt(process.env.BACKEND_PORT, 10) || 4000,
    env: process.env.NODE_ENV || 'development',
    url: process.env.BACKEND_URL || 'http://localhost:4000',
    apiPrefix: process.env.API_PREFIX || '/api/v1',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USER || 'mbois_user',
    password: process.env.DB_PASSWORD || 'mbois_password_2026',
    database: process.env.DB_NAME || 'festival_mbois',
    ssl: process.env.DB_SSL === 'true',
    logging: process.env.DB_LOGGING === 'true',
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || 'mbois_redis_2026',
    db: parseInt(process.env.REDIS_DB, 10) || 0,
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 10,
    encryptionKey: process.env.ENCRYPTION_KEY,
    cookieSecret: process.env.COOKIE_SECRET,
  },
  
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL, 10) || 60,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },
  
  workers: {
    interval: parseInt(process.env.WORKER_INTERVAL, 10) || 900000,
    batchSize: parseInt(process.env.WORKER_BATCH_SIZE, 10) || 100,
    maxRetries: parseInt(process.env.WORKER_MAX_RETRIES, 10) || 3,
    instagram: {
      enabled: process.env.INSTAGRAM_ENABLED === 'true',
      sessionId: process.env.INSTAGRAM_SESSION_ID,
    },
    tiktok: {
      enabled: process.env.TIKTOK_ENABLED === 'true',
      sessionId: process.env.TIKTOK_SESSION_ID,
    },
    website: {
      enabled: process.env.WEBSITE_ENABLED === 'true',
      urls: process.env.WEBSITE_URLS?.split(',') || [],
    },
  },
  
  sentiment: {
    enabled: process.env.SENTIMENT_ENABLED === 'true',
    model: process.env.SENTIMENT_MODEL || 'rule-based',
    threshold: parseFloat(process.env.SENTIMENT_THRESHOLD) || 0.5,
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log',
  },
  
  monitoring: {
    enabled: process.env.ENABLE_METRICS === 'true',
    port: parseInt(process.env.METRICS_PORT, 10) || 9090,
  },
});
