# Backend API - Festival Mbois Intelligence Platform

## Overview

NestJS-based backend API for Festival Mbois Intelligence Platform.

## Technology Stack

- **Framework:** NestJS 10.x
- **Language:** TypeScript 5.x
- **Database:** PostgreSQL 15+ with TypeORM
- **Cache:** Redis 7+
- **Authentication:** JWT with Passport
- **Documentation:** Swagger/OpenAPI
- **Validation:** class-validator

## Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL 15+
- Redis 7+

## Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp ../.env.example ../.env

# Update .env with your configuration
```

## Database Setup

```bash
# Start PostgreSQL and Redis with Docker
cd ../infrastructure/docker
docker-compose up -d

# Database will be automatically initialized with schema
```

## Running the Application

```bash
# Development
npm run start:dev

# Production build
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

## API Documentation

Once the server is running, access Swagger documentation at:
- http://localhost:4000/api/v1/docs

## Available Scripts

- `npm run start` - Start application
- `npm run start:dev` - Start with watch mode
- `npm run start:debug` - Start with debug mode
- `npm run build` - Build for production
- `npm run lint` - Lint code
- `npm run format` - Format code with Prettier
- `npm run test` - Run tests
- `npm run test:cov` - Run tests with coverage

## Project Structure

```
src/
├── config/           # Configuration files
├── common/           # Shared entities, DTOs, guards, decorators
├── modules/          # Feature modules
│   ├── auth/        # Authentication module
│   ├── users/       # Users module (coming)
│   ├── platforms/   # Platforms module (coming)
│   ├── posts/       # Posts module (coming)
│   └── analytics/   # Analytics module (coming)
└── main.ts          # Application entry point
```

## Default User

After database initialization, default admin account:
- **Email:** admin@festivalmbois.com
- **Password:** admin123

**⚠️ Change this in production!**

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/me` - Get current user

### More endpoints coming soon...

## Environment Variables

See `../.env.example` for all available configuration options.

Key variables:
- `DB_HOST` - PostgreSQL host
- `DB_PORT` - PostgreSQL port
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `REDIS_HOST` - Redis host
- `REDIS_PORT` - Redis port
- `JWT_SECRET` - JWT secret key

## Development Notes

- All passwords are hashed with bcrypt
- JWT tokens expire in 7 days (configurable)
- Rate limiting: 100 requests per minute
- API versioning via prefix: `/api/v1`
- Swagger docs auto-generated from decorators

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Next Steps

Week 1 (Current):
- [x] Project setup
- [x] Database schema
- [x] Authentication module
- [ ] Users module
- [ ] Platforms module
- [ ] Posts module

Week 2-3:
- [ ] Instagram worker integration
- [ ] TikTok worker integration
- [ ] Website scraper integration
- [ ] Analytics endpoints
- [ ] WebSocket real-time updates

## Support

For questions or issues, contact the development team.

---

**Created by:** Kharisman (maskhar.com)  
**Organization:** Utero Indonesia  
**Project:** Festival Mbois Intelligence Platform
