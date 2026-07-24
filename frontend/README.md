# Frontend Dashboard - Festival Mbois Intelligence Platform

Next.js 14 dashboard for Festival Mbois social media analytics.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** TailwindCSS
- **State Management:** Zustand + React Query
- **API Client:** Axios
- **UI Components:** Custom components with Lucide icons
- **Charts:** Recharts (ready to implement)

## Features

### Authentication
- Login page with demo credentials
- JWT token management
- Protected routes
- Auto logout on token expiration

### Dashboard Pages
1. **Overview** - Statistics, sentiment distribution, recent activity
2. **Posts** - List, filter, search posts by platform/sentiment
3. **Influencers** - Top influencers, rankings, profiles
4. **Platforms** - Platform stats, sentiment by platform
5. **Keywords** - Keyword management (Admin)
6. **Users** - User management (Admin)
7. **Analytics** - Deep insights, sentiment analysis, engagement

### Features Implemented
- Real-time data with React Query
- Advanced filtering and search
- Pagination
- Role-based access control
- Responsive design
- Loading states
- Error handling
- Toast notifications

## Installation

```bash
cd frontend
npm install
```

## Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

## Development

```bash
npm run dev
```

Open http://localhost:3000

## Default Credentials

- Email: admin@festivalmbois.com
- Password: admin123

## Project Structure

```
frontend/
├── app/
│   ├── dashboard/          # Dashboard pages
│   │   ├── page.tsx       # Overview
│   │   ├── posts/         # Posts page
│   │   ├── influencers/   # Influencers page
│   │   ├── platforms/     # Platforms page
│   │   ├── keywords/      # Keywords page
│   │   ├── users/         # Users page
│   │   └── analytics/     # Analytics page
│   ├── login/             # Login page
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/
│   └── dashboard/
│       └── sidebar.tsx    # Navigation sidebar
├── contexts/
│   ├── auth-context.tsx   # Auth state
│   └── providers.tsx      # React Query + Toaster
├── lib/
│   ├── api-client.ts      # API integration
│   ├── format.ts          # Helper functions
│   └── utils.ts           # Utilities
└── types/
    └── index.ts           # TypeScript types
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Features to Add (Week 2)

- [ ] Charts visualization with Recharts
- [ ] Export functionality (CSV, Excel)
- [ ] Real-time updates with WebSocket
- [ ] Dark mode
- [ ] Advanced filters
- [ ] Bulk actions
- [ ] Post detail modal
- [ ] Influencer detail page

## Status

✅ Authentication - Complete  
✅ Dashboard Overview - Complete  
✅ Posts Page - Complete  
✅ Influencers Page - Complete  
✅ Platforms Page - Complete  
✅ Keywords Management - Complete  
✅ Users Management - Complete  
✅ Analytics Page - Complete  

**Overall Progress:** 70% Complete

## Next Steps

1. Add charts to dashboard and analytics
2. Implement real-time updates
3. Add export functionality
4. Improve mobile responsiveness
5. Add more interactive features

---

**Created by:** Kharisman (maskhar.com)  
**Organization:** Utero Indonesia  
**Project:** Festival Mbois Intelligence Platform
