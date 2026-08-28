// User types
export enum UserRole {
  ADMIN = 'admin',
  ANALYST = 'analyst',
  VIEWER = 'viewer',
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// Platform types
export enum PlatformType {
  INSTAGRAM = 'instagram',
  TIKTOK = 'tiktok',
  FACEBOOK = 'facebook',
  THREADS = 'threads',
  TWITTER = 'twitter',
  WEBSITE = 'website',
}

export interface Platform {
  id: string;
  name: string;
  type: PlatformType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlatformStats {
  platformId: string;
  platformName: string;
  platformType: string;
  totalPosts: number;
  totalInfluencers: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalViews: number;
  avgEngagementScore: number;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  lastScrapedAt: Date | null;
}

// Post types
export enum PostType {
  POST = 'post',
  REEL = 'reel',
  STORY = 'story',
  VIDEO = 'video',
  ARTICLE = 'article',
}

export enum SentimentType {
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative',
}

export interface Post {
  id: string;
  platformId: string;
  platformName: string;
  platformType: string;
  influencerId: string;
  influencerUsername: string;
  influencerName: string;
  platformPostId: string;
  postType: PostType;
  content: string;
  mediaUrls: string[];
  postUrl: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  engagementScore: number;
  sentiment: SentimentType;
  sentimentScore: number;
  hashtags: string[];
  mentions: string[];
  location: string;
  postedAt: Date;
  scrapedAt: Date;
  createdAt: Date;
}

export interface PostStats {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalViews: number;
  avgEngagementScore: number;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

// Influencer types
export interface Influencer {
  id: string;
  platformId: string;
  platformName: string;
  platformType: string;
  platformUserId: string;
  username: string;
  fullName: string;
  profilePictureUrl: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  engagementRate: number;
  isVerified: boolean;
  lastScrapedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InfluencerDetail extends Influencer {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  avgEngagementScore: number;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

// Analytics types
export interface DashboardOverview {
  totalPosts: number;
  totalInfluencers: number;
  totalPlatforms: number;
  totalEngagement: number;
  avgEngagementScore: number;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
    positivePercentage: number;
    neutralPercentage: number;
    negativePercentage: number;
  };
  topPlatform: {
    name: string;
    postsCount: number;
  };
  recentActivity: {
    last24Hours: number;
    last7Days: number;
    last30Days: number;
  };
}

export interface TimeSeriesDataPoint {
  date: string;
  count: number;
  engagement: number;
}

export interface TrendAnalytics {
  dailyPosts: TimeSeriesDataPoint[];
  hourlyPosts: TimeSeriesDataPoint[];
  growthRate: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

export interface TopHashtag {
  hashtag: string;
  count: number;
  growth: number;
}

export interface SentimentAnalytics {
  overall: {
    positive: number;
    neutral: number;
    negative: number;
  };
  byPlatform: Array<{
    platformName: string;
    positive: number;
    neutral: number;
    negative: number;
  }>;
  trend: Array<{
    date: string;
    positive: number;
    neutral: number;
    negative: number;
  }>;
}

// Engagement Analytics types
export interface TopEngagingPost {
  id: string;
  content: string;
  engagementScore: number;
  platform: string;
  sentiment: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  postedAt: string;
}

export interface EngagementAnalytics {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalViews: number;
  avgLikesPerPost: number;
  avgCommentsPerPost: number;
  avgSharesPerPost: number;
  avgEngagementPerPost: number;
  topEngagingPosts: TopEngagingPost[];
}

// Keyword types
export interface Keyword {
  id: string;
  keyword: string;
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

// Pagination types
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// API Response types
export type ApiResponse<T> = T;
export type ApiError = {
  message: string;
  statusCode: number;
  error?: string;
};
