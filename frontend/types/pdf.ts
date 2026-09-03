/**
 * Type definitions for PDF Report Export Service
 * 
 * These interfaces define the data structures used by PDFReportService
 * for generating dashboard, posts, and analytics reports.
 * All user-visible strings come from i18n dictionaries.
 */

import { PlatformType } from './index';

/**
 * Dashboard Overview Report Data
 * Contains aggregated statistics for the main dashboard PDF report
 */
export interface DashboardOverviewData {
  /** Total number of posts across all platforms */
  totalPosts: number;
  /** Total number of unique influencers */
  totalInfluencers: number;
  /** Number of active platforms */
  totalPlatforms: number;
  /** Total engagement (likes + comments + shares) */
  totalEngagement: number;
  /** Average engagement score across all posts */
  avgEngagementScore: number;
  /** Sentiment distribution breakdown */
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
    positivePercentage: number;
    neutralPercentage: number;
    negativePercentage: number;
  };
  /** Top performing platform */
  topPlatform: {
    name: string;
    postsCount: number;
  } | null;
  /** Recent activity counts */
  recentActivity: {
    last24Hours: number;
    last7Days: number;
    last30Days: number;
  };
}

/**
 * Single Post Data for Posts Report
 * Represents a post row in the posts PDF table
 */
export interface PostReportData {
  /** Platform name (e.g., "Instagram", "Twitter") */
  platformName: string;
  /** Influencer/author name */
  influencerName: string;
  /** Post content (truncated in report) */
  content: string;
  /** Sentiment classification */
  sentiment: 'positive' | 'neutral' | 'negative';
  /** Number of likes */
  likesCount: number;
  /** Number of comments */
  commentsCount: number;
  /** Engagement score */
  engagementScore: number;
  /** Platform type for color coding */
  platformType?: PlatformType;
}

/**
 * Posts Report Data
 * Contains filtered posts and optional filter metadata for PDF generation
 */
export interface PostsReportData {
  /** Array of posts to include in the report (max 50) */
  posts: PostReportData[];
  /** Optional filters applied when fetching posts */
  filters?: {
    platform?: string;
    sentiment?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

/**
 * Engagement Metrics for Analytics Report
 */
export interface EngagementMetrics {
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalViews: number;
  avgLikesPerPost: number;
  avgCommentsPerPost: number;
  avgSharesPerPost: number;
}

/**
 * Hashtag Analytics Data
 */
export interface HashtagAnalyticsData {
  hashtag: string;
  count: number;
  growth: number;
}

/**
 * Sentiment Analytics Data
 */
export interface SentimentAnalyticsData {
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

/**
 * Analytics Report Data
 * Contains detailed analytics for the analytics PDF report
 */
export interface AnalyticsReportData {
  /** Sentiment analysis data */
  sentiment?: SentimentAnalyticsData;
  /** Engagement metrics */
  engagement?: EngagementMetrics;
  /** Top hashtags */
  hashtags?: HashtagAnalyticsData[];
}