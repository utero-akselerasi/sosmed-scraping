# Frontend Architecture Document
# Festival Mbois Intelligence Platform

**Version:** 1.0  
**Date:** July 23, 2026  
**Status:** Draft for Approval

---

## 1. FRONTEND OVERVIEW

### 1.1 Purpose
This document defines the frontend architecture, component structure, state management, styling approach, and development patterns for the Festival Mbois Intelligence Platform dashboard.

### 1.2 Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | Next.js | 14+ (App Router) |
| UI Library | React | 18+ |
| Language | TypeScript | 5.0+ |
| Styling | TailwindCSS | 3.4+ |
| Component Library | Shadcn UI | Latest |
| State Management | Zustand | 4.0+ |
| Data Fetching | TanStack Query (React Query) | 5.0+ |
| Charts | Recharts | 2.10+ |
| Forms | React Hook Form | 7.0+ |
| Validation | Zod | 3.0+ |
| HTTP Client | Axios | 1.6+ |
| WebSocket | Socket.IO Client | 4.0+ |
| Date/Time | date-fns | 3.0+ |
| Icons | Lucide React | Latest |
| Testing | Jest + React Testing Library | Latest |

### 1.3 Design Principles

- **Component-Based:** Reusable, composable components
- **Type-Safe:** Full TypeScript coverage
- **Performance:** Code splitting, lazy loading, memoization
- **Accessibility:** WCAG 2.1 AA compliance
- **Responsive:** Mobile-first design (desktop priority)
- **Maintainable:** Clear structure, documented patterns
- **User-Centric:** Intuitive UI/UX, fast interactions

---

## 2. PROJECT STRUCTURE

### 2.1 Folder Structure

\\\
festival-mbois-frontend/
├── public/
│   ├── fonts/
│   ├── images/
│   └── favicon.ico
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/              # Auth layout group
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── forgot-password/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/         # Dashboard layout group
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx         # Dashboard home
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx
│   │   │   ├── posts/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── influencers/
│   │   │   │   └── page.tsx
│   │   │   ├── keywords/
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │   ├── layout.tsx           # Root layout
│   │   ├── globals.css
│   │   └── providers.tsx
│   ├── components/
│   │   ├── ui/                  # Shadcn UI components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ...
│   │   ├── layout/              # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── DashboardLayout.tsx
│   │   ├── dashboard/           # Dashboard-specific
│   │   │   ├── MetricCard.tsx
│   │   │   ├── OverviewStats.tsx
│   │   │   ├── GrowthChart.tsx
│   │   │   ├── SentimentPieChart.tsx
│   │   │   ├── PlatformDistribution.tsx
│   │   │   └── RealtimeUpdates.tsx
│   │   ├── posts/               # Post-related
│   │   │   ├── PostCard.tsx
│   │   │   ├── PostList.tsx
│   │   │   ├── PostDetail.tsx
│   │   │   ├── PostFilters.tsx
│   │   │   └── PostSearch.tsx
│   │   ├── influencers/         # Influencer components
│   │   │   ├── InfluencerCard.tsx
│   │   │   ├── InfluencerList.tsx
│   │   │   └── InfluencerStats.tsx
│   │   ├── charts/              # Chart components
│   │   │   ├── LineChart.tsx
│   │   │   ├── BarChart.tsx
│   │   │   ├── PieChart.tsx
│   │   │   ├── AreaChart.tsx
│   │   │   └── TrendChart.tsx
│   │   ├── forms/               # Form components
│   │   │   ├── LoginForm.tsx
│   │   │   ├── KeywordForm.tsx
│   │   │   └── UserForm.tsx
│   │   └── common/              # Shared components
│   │       ├── LoadingSpinner.tsx
│   │       ├── ErrorBoundary.tsx
│   │       ├── Pagination.tsx
│   │       ├── DateRangePicker.tsx
│   │       ├── PlatformBadge.tsx
│   │       ├── SentimentBadge.tsx
│   │       └── ExportButton.tsx
│   ├── lib/                     # Utilities
│   │   ├── api/                 # API client
│   │   │   ├── client.ts
│   │   │   ├── auth.ts
│   │   │   ├── analytics.ts
│   │   │   ├── posts.ts
│   │   │   ├── keywords.ts
│   │   │   └── users.ts
│   │   ├── hooks/               # Custom hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useAnalytics.ts
│   │   │   ├── usePosts.ts
│   │   │   ├── useWebSocket.ts
│   │   │   ├── useDebounce.ts
│   │   │   └── useLocalStorage.ts
│   │   ├── store/               # Zustand stores
│   │   │   ├── authStore.ts
│   │   │   ├── uiStore.ts
│   │   │   └── realtimeStore.ts
│   │   ├── utils/               # Helper functions
│   │   │   ├── formatters.ts
│   │   │   ├── validators.ts
│   │   │   ├── date.ts
│   │   │   └── constants.ts
│   │   └── types/               # TypeScript types
│   │       ├── api.ts
│   │       ├── dashboard.ts
│   │       ├── posts.ts
│   │       └── user.ts
│   ├── styles/
│   │   └── themes/
│   │       ├── light.ts
│   │       └── dark.ts
│   └── middleware.ts            # Next.js middleware
├── .env.local
├── .env.example
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── README.md
\\\

---

## 3. ROUTING & NAVIGATION

### 3.1 Route Structure

| Route | Page | Access | Description |
|-------|------|--------|-------------|
| \/\ | Redirect | Public | Redirect to /dashboard or /login |
| \/login\ | Login | Public | User login |
| \/forgot-password\ | Forgot Password | Public | Password reset request |
| \/dashboard\ | Dashboard Home | Authenticated | Overview metrics |
| \/analytics\ | Analytics | Authenticated | Detailed analytics |
| \/posts\ | Posts List | Authenticated | Browse all posts |
| \/posts/[id]\ | Post Detail | Authenticated | Single post view |
| \/influencers\ | Influencers | Authenticated | Top influencers |
| \/keywords\ | Keywords | Admin only | Manage keywords |
| \/settings\ | Settings | Authenticated | User settings |
| \/users\ | User Management | Admin only | Manage users |

### 3.2 Navigation Structure

\\\
Header
├── Logo
├── Search (global)
├── Notifications
├── Theme Toggle (Dark/Light)
└── User Menu
    ├── Profile
    ├── Settings
    └── Logout

Sidebar
├── Dashboard
├── Analytics
├── Posts
├── Influencers
├── Keywords (Admin)
├── Users (Admin)
└── Settings
\\\

---

## 4. COMPONENT ARCHITECTURE

### 4.1 Component Hierarchy

\\\
App
├── RootLayout
│   ├── Providers
│   │   ├── QueryClientProvider
│   │   ├── ThemeProvider
│   │   └── WebSocketProvider
│   └── Body
│       ├── AuthLayout (public pages)
│       │   └── LoginForm
│       └── DashboardLayout (authenticated pages)
│           ├── Header
│           ├── Sidebar
│           ├── MainContent
│           │   ├── Dashboard
│           │   │   ├── OverviewStats
│           │   │   ├── GrowthChart
│           │   │   ├── SentimentChart
│           │   │   ├── PlatformDistribution
│           │   │   └── RecentPosts
│           │   ├── Analytics
│           │   ├── Posts
│           │   └── ...
│           └── Footer
\\\

### 4.2 Component Patterns

#### 4.2.1 Presentation Components
**Purpose:** Pure UI components, no business logic

**Example:**
\\\	ypescript
// components/dashboard/MetricCard.tsx
interface MetricCardProps {
  title: string;
  value: number;
  change?: number;
  icon: React.ReactNode;
  format?: 'number' | 'currency' | 'percentage';
}

export function MetricCard({ 
  title, 
  value, 
  change, 
  icon, 
  format = 'number' 
}: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatValue(value, format)}
        </div>
        {change !== undefined && (
          <p className={\	ext-xs \\}>
            {change >= 0 ? '+' : ''}{change}% from last period
          </p>
        )}
      </CardContent>
    </Card>
  );
}
\\\

#### 4.2.2 Container Components
**Purpose:** Handle data fetching and business logic

**Example:**
\\\	ypescript
// app/(dashboard)/dashboard/page.tsx
'use client';

import { useAnalytics } from '@/lib/hooks/useAnalytics';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const { data, isLoading, error } = useAnalytics({
    startDate: '2026-07-01',
    endDate: '2026-07-31'
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Mentions"
        value={data.totalMentions}
        change={12.5}
        icon={<TrendingUp className="h-4 w-4" />}
        format="number"
      />
      {/* More cards... */}
    </div>
  );
}
\\\

#### 4.2.3 Custom Hooks Pattern

**Example:**
\\\	ypescript
// lib/hooks/useAnalytics.ts
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api/analytics';

interface UseAnalyticsOptions {
  startDate?: string;
  endDate?: string;
  platform?: string;
}

export function useAnalytics(options: UseAnalyticsOptions = {}) {
  return useQuery({
    queryKey: ['analytics', 'overview', options],
    queryFn: () => analyticsApi.getOverview(options),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // 1 minute
  });
}
\\\

---

## 5. STATE MANAGEMENT

### 5.1 State Management Strategy

| State Type | Solution | Use Case |
|------------|----------|----------|
| Server State | TanStack Query | API data, caching |
| Global UI State | Zustand | Theme, sidebar, modals |
| Authentication | Zustand + localStorage | User session |
| Form State | React Hook Form | Form handling |
| Local Component State | useState | Component-specific state |
| Real-time State | Zustand + WebSocket | Live updates |

### 5.2 Zustand Stores

#### 5.2.1 Auth Store
\\\	ypescript
// lib/store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'analyst' | 'viewer';
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      login: (user, token) => set({ 
        user, 
        accessToken: token, 
        isAuthenticated: true 
      }),
      logout: () => set({ 
        user: null, 
        accessToken: null, 
        isAuthenticated: false 
      }),
      updateUser: (userData) => set((state) => ({
        user: state.user ? { ...state.user, ...userData } : null
      })),
    }),
    {
      name: 'auth-storage',
    }
  )
);
\\\

#### 5.2.2 UI Store
\\\	ypescript
// lib/store/uiStore.ts
import { create } from 'zustand';

interface UIState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: 'light',
  sidebarOpen: true,
  toggleTheme: () => set((state) => ({ 
    theme: state.theme === 'light' ? 'dark' : 'light' 
  })),
  toggleSidebar: () => set((state) => ({ 
    sidebarOpen: !state.sidebarOpen 
  })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
\\\

#### 5.2.3 Realtime Store
\\\	ypescript
// lib/store/realtimeStore.ts
import { create } from 'zustand';

interface RealtimeState {
  newPostsCount: number;
  latestMetrics: any | null;
  incrementNewPosts: () => void;
  resetNewPosts: () => void;
  updateMetrics: (metrics: any) => void;
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  newPostsCount: 0,
  latestMetrics: null,
  incrementNewPosts: () => set((state) => ({ 
    newPostsCount: state.newPostsCount + 1 
  })),
  resetNewPosts: () => set({ newPostsCount: 0 }),
  updateMetrics: (metrics) => set({ latestMetrics: metrics }),
}));
\\\

### 5.3 TanStack Query Configuration

\\\	ypescript
// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
\\\

---

## 6. API INTEGRATION

### 6.1 API Client Setup

\\\	ypescript
// lib/api/client.ts
import axios from 'axios';
import { useAuthStore } from '@/lib/store/authStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = \Bearer \\;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - logout
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);
\\\

### 6.2 API Service Example

\\\	ypescript
// lib/api/analytics.ts
import { apiClient } from './client';

export interface OverviewParams {
  startDate?: string;
  endDate?: string;
  platform?: string;
}

export interface OverviewResponse {
  totalMentions: number;
  totalReach: number;
  totalEngagement: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalAuthors: number;
  avgEngagementRate: number;
}

export const analyticsApi = {
  getOverview: async (params: OverviewParams): Promise<OverviewResponse> => {
    const { data } = await apiClient.get('/analytics/overview', { params });
    return data;
  },

  getGrowth: async (params: any) => {
    const { data } = await apiClient.get('/analytics/growth', { params });
    return data;
  },

  getTrendingKeywords: async (params: any) => {
    const { data } = await apiClient.get('/analytics/trending/keywords', { params });
    return data;
  },

  // ... more methods
};
\\\

---

## 7. STYLING & THEMING

### 7.1 TailwindCSS Configuration

\\\javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        positive: 'hsl(142, 76%, 36%)',
        neutral: 'hsl(47, 100%, 50%)',
        negative: 'hsl(0, 84%, 60%)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
\\\

### 7.2 CSS Variables (Light/Dark Theme)

\\\css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}
\\\

### 7.3 Theme Toggle Component

\\\	ypescript
// components/common/ThemeToggle.tsx
'use client';

import { Moon, Sun } from 'lucide-react';
import { useUIStore } from '@/lib/store/uiStore';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, toggleTheme } = useUIStore();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </Button>
  );
}
\\\

---

## 8. REAL-TIME UPDATES

### 8.1 WebSocket Integration

\\\	ypescript
// lib/hooks/useWebSocket.ts
import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/lib/store/authStore';
import { useRealtimeStore } from '@/lib/store/realtimeStore';

let socket: Socket | null = null;

export function useWebSocket() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const incrementNewPosts = useRealtimeStore((state) => state.incrementNewPosts);
  const updateMetrics = useRealtimeStore((state) => state.updateMetrics);

  useEffect(() => {
    if (!accessToken) return;

    const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000';
    
    socket = io(WS_URL, {
      query: { token: accessToken },
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
      socket?.emit('subscribe', { channels: ['posts', 'metrics'] });
    });

    socket.on('post', (data) => {
      console.log('New post:', data);
      incrementNewPosts();
    });

    socket.on('metrics', (data) => {
      console.log('Metrics update:', data);
      updateMetrics(data.data);
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [accessToken, incrementNewPosts, updateMetrics]);

  return socket;
}
\\\

### 8.2 Real-time Notification Component

\\\	ypescript
// components/dashboard/RealtimeUpdates.tsx
'use client';

import { useRealtimeStore } from '@/lib/store/realtimeStore';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export function RealtimeUpdates() {
  useWebSocket(); // Connect to WebSocket

  const newPostsCount = useRealtimeStore((state) => state.newPostsCount);
  const resetNewPosts = useRealtimeStore((state) => state.resetNewPosts);

  const handleRefresh = () => {
    window.location.reload();
    resetNewPosts();
  };

  if (newPostsCount === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button onClick={handleRefresh} className="shadow-lg">
        <RefreshCw className="mr-2 h-4 w-4" />
        {newPostsCount} new post{newPostsCount > 1 ? 's' : ''} - Refresh
      </Button>
    </div>
  );
}
\\\

---


## 9. FORMS & VALIDATION

### 9.1 Form Handling with React Hook Form + Zod

\\\	ypescript
// components/forms/LoginForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/authStore';
import { useRouter } from 'next/navigation';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const response = await authApi.login(data);
      login(response.user, response.accessToken);
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Login failed:', error);
      // Handle error (show toast notification)
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          placeholder="you@example.com"
        />
        {errors.email && (
          <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          {...register('password')}
          placeholder="••••••••"
        />
        {errors.password && (
          <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Logging in...' : 'Login'}
      </Button>
    </form>
  );
}
\\\

### 9.2 Keyword Form Example

\\\	ypescript
// components/forms/KeywordForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { keywordsApi } from '@/lib/api/keywords';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const keywordSchema = z.object({
  keyword: z.string().min(2).max(255),
  isActive: z.boolean().default(true),
});

type KeywordFormData = z.infer<typeof keywordSchema>;

interface KeywordFormProps {
  initialData?: KeywordFormData;
  onSuccess?: () => void;
}

export function KeywordForm({ initialData, onSuccess }: KeywordFormProps) {
  const queryClient = useQueryClient();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<KeywordFormData>({
    resolver: zodResolver(keywordSchema),
    defaultValues: initialData || { isActive: true },
  });

  const createMutation = useMutation({
    mutationFn: keywordsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keywords'] });
      onSuccess?.();
    },
  });

  const onSubmit = (data: KeywordFormData) => {
    createMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="keyword">Keyword</Label>
        <Input
          id="keyword"
          {...register('keyword')}
          placeholder="Festival Mbois 2027"
        />
        {errors.keyword && (
          <p className="text-sm text-red-600 mt-1">{errors.keyword.message}</p>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isActive"
          checked={watch('isActive')}
          onCheckedChange={(checked) => setValue('isActive', checked)}
        />
        <Label htmlFor="isActive">Active</Label>
      </div>

      <Button type="submit" disabled={createMutation.isPending}>
        {createMutation.isPending ? 'Saving...' : 'Save Keyword'}
      </Button>
    </form>
  );
}
\\\

---

## 10. DATA VISUALIZATION

### 10.1 Chart Components

#### 10.1.1 Growth Chart (Line Chart)

\\\	ypescript
// components/charts/GrowthChart.tsx
'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

interface GrowthChartProps {
  data: Array<{
    date: string;
    posts: number;
    engagement: number;
  }>;
}

export function GrowthChart({ data }: GrowthChartProps) {
  const formattedData = data.map((item) => ({
    ...item,
    date: format(new Date(item.date), 'MMM dd'),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Growth</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="posts" 
              stroke="#8884d8" 
              strokeWidth={2}
              name="Posts"
            />
            <Line 
              type="monotone" 
              dataKey="engagement" 
              stroke="#82ca9d" 
              strokeWidth={2}
              name="Engagement"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
\\\

#### 10.1.2 Sentiment Pie Chart

\\\	ypescript
// components/charts/SentimentPieChart.tsx
'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SentimentPieChartProps {
  data: {
    positive: { count: number; percentage: number };
    neutral: { count: number; percentage: number };
    negative: { count: number; percentage: number };
  };
}

const COLORS = {
  positive: 'hsl(142, 76%, 36%)',
  neutral: 'hsl(47, 100%, 50%)',
  negative: 'hsl(0, 84%, 60%)',
};

export function SentimentPieChart({ data }: SentimentPieChartProps) {
  const chartData = [
    { name: 'Positive', value: data.positive.count, percentage: data.positive.percentage },
    { name: 'Neutral', value: data.neutral.count, percentage: data.neutral.percentage },
    { name: 'Negative', value: data.negative.count, percentage: data.negative.percentage },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sentiment Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percentage }) => \\: \%\}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={\cell-\\} 
                  fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS]} 
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
\\\

#### 10.1.3 Platform Distribution Bar Chart

\\\	ypescript
// components/charts/PlatformDistributionChart.tsx
'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PlatformDistributionChartProps {
  data: Array<{
    platform: string;
    totalPosts: number;
    totalEngagement: number;
    percentage: number;
  }>;
}

export function PlatformDistributionChart({ data }: PlatformDistributionChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="platform" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="totalPosts" fill="#8884d8" name="Posts" />
            <Bar dataKey="totalEngagement" fill="#82ca9d" name="Engagement" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
\\\

---

## 11. AUTHENTICATION & AUTHORIZATION

### 11.1 Route Protection Middleware

\\\	ypescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicRoutes = ['/login', '/forgot-password'];
const adminRoutes = ['/users', '/keywords'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('accessToken');
  const userRole = request.cookies.get('userRole')?.value;

  // Public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Check authentication
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Check admin routes
  if (adminRoutes.some(route => pathname.startsWith(route))) {
    if (userRole !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
\\\

### 11.2 Protected Route Component

\\\	ypescript
// components/common/ProtectedRoute.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { LoadingSpinner } from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<'admin' | 'analyst' | 'viewer'>;
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, user, allowedRoles, router]);

  if (!isAuthenticated) {
    return <LoadingSpinner />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <LoadingSpinner />;
  }

  return <>{children}</>;
}
\\\

---

## 12. PERFORMANCE OPTIMIZATION

### 12.1 Code Splitting

\\\	ypescript
// Dynamic imports for heavy components
import dynamic from 'next/dynamic';

const ChartComponent = dynamic(
  () => import('@/components/charts/GrowthChart'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false, // Disable SSR for chart components
  }
);
\\\

### 12.2 Image Optimization

\\\	ypescript
// Using Next.js Image component
import Image from 'next/image';

<Image
  src={author.profileImageUrl}
  alt={author.displayName}
  width={40}
  height={40}
  className="rounded-full"
  loading="lazy"
/>
\\\

### 12.3 Memoization

\\\	ypescript
import { useMemo, memo } from 'react';

// Memoize expensive calculations
const sortedPosts = useMemo(() => {
  return posts.sort((a, b) => b.engagementScore - a.engagementScore);
}, [posts]);

// Memoize components
export const PostCard = memo(function PostCard({ post }: PostCardProps) {
  return (
    // Component JSX
  );
});
\\\

### 12.4 Debouncing Search

\\\	ypescript
// lib/hooks/useDebounce.ts
import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Usage in search component
const [searchQuery, setSearchQuery] = useState('');
const debouncedSearch = useDebounce(searchQuery, 500);

useEffect(() => {
  // Trigger search with debounced value
  if (debouncedSearch) {
    performSearch(debouncedSearch);
  }
}, [debouncedSearch]);
\\\

### 12.5 Virtual Scrolling (Future Enhancement)

\\\	ypescript
// For large lists, consider react-window or react-virtual
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={posts.length}
  itemSize={120}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <PostCard post={posts[index]} />
    </div>
  )}
</FixedSizeList>
\\\

---

## 13. ACCESSIBILITY (A11Y)

### 13.1 Accessibility Requirements

- **WCAG 2.1 AA Compliance**
- Keyboard navigation support
- Screen reader compatibility
- Sufficient color contrast (4.5:1 minimum)
- Focus indicators
- ARIA labels and roles
- Alternative text for images

### 13.2 Accessible Component Example

\\\	ypescript
// components/common/Button.tsx
import { forwardRef } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', size = 'md', loading, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={\utton button-\ button-\\}
        disabled={loading || props.disabled}
        aria-busy={loading}
        aria-disabled={loading || props.disabled}
        {...props}
      >
        {loading && (
          <span className="sr-only">Loading...</span>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
\\\

### 13.3 Keyboard Navigation

\\\	ypescript
// components/dashboard/PostCard.tsx
export function PostCard({ post }: PostCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      // Navigate to post detail
    }
  };

  return (
    <div
      role="article"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={\Post by \\}
      className="post-card"
    >
      {/* Post content */}
    </div>
  );
}
\\\

---

## 14. ERROR HANDLING

### 14.1 Error Boundary

\\\	ypescript
// components/common/ErrorBoundary.tsx
'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Log to error tracking service (Sentry, etc.)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center min-h-screen">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="text-muted-foreground mb-4">
              {this.state.error?.message}
            </p>
            <Button onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
\\\

### 14.2 API Error Handling

\\\	ypescript
// components/common/ErrorMessage.tsx
interface ErrorMessageProps {
  error: any;
  retry?: () => void;
}

export function ErrorMessage({ error, retry }: ErrorMessageProps) {
  const errorMessage = error?.message || 'An unexpected error occurred';

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <div className="flex items-start">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800">Error</h3>
          <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
        </div>
        {retry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={retry}
            className="ml-4"
          >
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
\\\

---

## 15. TESTING STRATEGY

### 15.1 Testing Pyramid

\\\
        /\\
       /  \\
      / E2E \\          (10%) - Cypress/Playwright
     /--------\\
    /          \\
   / Integration \\     (30%) - React Testing Library
  /--------------\\
 /                \\
/      Unit        \\   (60%) - Jest
--------------------
\\\

### 15.2 Unit Test Example

\\\	ypescript
// components/dashboard/MetricCard.test.tsx
import { render, screen } from '@testing-library/react';
import { MetricCard } from './MetricCard';
import { TrendingUp } from 'lucide-react';

describe('MetricCard', () => {
  it('renders metric title and value', () => {
    render(
      <MetricCard
        title="Total Mentions"
        value={15420}
        icon={<TrendingUp />}
      />
    );

    expect(screen.getByText('Total Mentions')).toBeInTheDocument();
    expect(screen.getByText('15,420')).toBeInTheDocument();
  });

  it('displays positive change correctly', () => {
    render(
      <MetricCard
        title="Total Mentions"
        value={15420}
        change={12.5}
        icon={<TrendingUp />}
      />
    );

    expect(screen.getByText('+12.5% from last period')).toBeInTheDocument();
  });

  it('displays negative change correctly', () => {
    render(
      <MetricCard
        title="Total Mentions"
        value={15420}
        change={-5.2}
        icon={<TrendingUp />}
      />
    );

    expect(screen.getByText('-5.2% from last period')).toBeInTheDocument();
  });
});
\\\

### 15.3 Integration Test Example

\\\	ypescript
// app/(dashboard)/dashboard/page.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardPage from './page';
import { analyticsApi } from '@/lib/api/analytics';

jest.mock('@/lib/api/analytics');

describe('Dashboard Page', () => {
  it('loads and displays analytics data', async () => {
    const mockData = {
      totalMentions: 15420,
      totalReach: 5840000,
      totalEngagement: 234500,
    };

    (analyticsApi.getOverview as jest.Mock).mockResolvedValue(mockData);

    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <DashboardPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('15,420')).toBeInTheDocument();
      expect(screen.getByText('5,840,000')).toBeInTheDocument();
    });
  });
});
\\\

---

## 16. BUILD & DEPLOYMENT

### 16.1 Build Configuration

\\\javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [
      'instagram.com',
      'tiktok.com',
      'facebook.com',
      // Add other image domains
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  },
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

module.exports = nextConfig;
\\\

### 16.2 Environment Variables

\\\ash
# .env.example
NEXT_PUBLIC_API_URL=https://api.festivalmbois.com/api/v1
NEXT_PUBLIC_WS_URL=wss://api.festivalmbois.com
NEXT_PUBLIC_APP_NAME=Festival Mbois Intelligence
\\\

### 16.3 Build Scripts

\\\json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
\\\

---

## 17. PERFORMANCE METRICS

### 17.1 Core Web Vitals Targets

| Metric | Target | Max |
|--------|--------|-----|
| Largest Contentful Paint (LCP) | < 2.5s | 4.0s |
| First Input Delay (FID) | < 100ms | 300ms |
| Cumulative Layout Shift (CLS) | < 0.1 | 0.25 |
| Time to Interactive (TTI) | < 3.5s | 5.0s |
| First Contentful Paint (FCP) | < 1.5s | 3.0s |

### 17.2 Bundle Size Monitoring

\\\ash
# Analyze bundle size
npm run build
npx @next/bundle-analyzer
\\\

**Target Bundle Sizes:**
- First Load JS: < 200 KB
- Route JS: < 100 KB per route
- Shared JS: < 50 KB

---

## 18. BROWSER SUPPORT

### 18.1 Supported Browsers

| Browser | Version |
|---------|---------|
| Chrome | Last 2 versions |
| Firefox | Last 2 versions |
| Safari | Last 2 versions |
| Edge | Last 2 versions |

### 18.2 Polyfills

Modern features are transpiled by Next.js automatically. No additional polyfills required for target browsers.

---

## 19. DOCUMENTATION

### 19.1 Component Documentation

Each component should include:
- JSDoc comments
- TypeScript interfaces for props
- Usage examples
- Accessibility notes

\\\	ypescript
/**
 * MetricCard displays a metric with optional change indicator
 * 
 * @example
 * \\\	sx
 * <MetricCard
 *   title="Total Mentions"
 *   value={15420}
 *   change={12.5}
 *   icon={<TrendingUp />}
 * />
 * \\\
 */
interface MetricCardProps {
  /** Metric title */
  title: string;
  /** Numeric value to display */
  value: number;
  /** Percentage change (optional) */
  change?: number;
  /** Icon component */
  icon: React.ReactNode;
  /** Format type for value display */
  format?: 'number' | 'currency' | 'percentage';
}
\\\

### 19.2 Storybook (Future Enhancement)

Consider adding Storybook for component documentation and visual testing.

---

## 20. FUTURE ENHANCEMENTS

### 20.1 Progressive Web App (PWA)

- Service worker for offline support
- App manifest
- Push notifications
- Install prompts

### 20.2 Advanced Features

- Multi-language support (i18n)
- Advanced filtering UI
- Custom dashboard widgets
- Drag-and-drop dashboard customization
- Saved views and filters
- Scheduled reports UI

### 20.3 Performance Enhancements

- Server components optimization
- Edge runtime for API routes
- Incremental static regeneration
- Streaming SSR

---

## 21. APPROVAL & NEXT STEPS

### 21.1 Review Checklist
- [ ] Component structure defined
- [ ] State management strategy approved
- [ ] API integration patterns established
- [ ] Styling approach confirmed
- [ ] Performance targets set
- [ ] Accessibility requirements documented
- [ ] Testing strategy defined

### 21.2 Implementation Checklist
- [ ] Next.js project initialized
- [ ] Core UI components created
- [ ] Authentication flow implemented
- [ ] Dashboard pages built
- [ ] Charts integrated
- [ ] Real-time updates working
- [ ] Forms and validation implemented
- [ ] Tests written
- [ ] Performance optimized

### 21.3 Next Documents
1. ✅ PRD
2. ✅ System Design
3. ✅ Database Design
4. ✅ API Design
5. ✅ Frontend Architecture (this document)
6. ⏭️ Development Roadmap
7. ⏭️ Task Breakdown

---

**Document Status:** Ready for Review  
**Next Action:** Development Roadmap & Task Breakdown

