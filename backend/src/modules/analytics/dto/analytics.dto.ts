import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsDateString, IsString } from "class-validator";

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ description: "Start date (ISO 8601)" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: "End date (ISO 8601)" })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: "Platform ID filter" })
  @IsOptional()
  platformId?: string;

  @ApiPropertyOptional({ description: "Filter by keyword in post content" })
  @IsOptional()
  @IsString()
  keyword?: string;
}

export class DashboardOverviewDto {
  @ApiProperty()
  totalPosts: number;

  @ApiProperty()
  totalInfluencers: number;

  @ApiProperty()
  totalPlatforms: number;

  @ApiProperty()
  totalEngagement: number;

  @ApiProperty()
  avgEngagementScore: number;

  @ApiProperty()
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
    positivePercentage: number;
    neutralPercentage: number;
    negativePercentage: number;
  };

  @ApiProperty()
  topPlatform: {
    name: string;
    postsCount: number;
  };

  @ApiProperty()
  recentActivity: {
    last24Hours: number;
    last7Days: number;
    last30Days: number;
  };
}

export class TimeSeriesDataPoint {
  @ApiProperty()
  date: string;

  @ApiProperty()
  count: number;

  @ApiProperty()
  engagement: number;

  @ApiPropertyOptional()
  likes?: number;

  @ApiPropertyOptional()
  comments?: number;

  @ApiPropertyOptional()
  shares?: number;
}

export class TrendAnalyticsDto {
  @ApiProperty({ type: [TimeSeriesDataPoint] })
  dailyPosts: TimeSeriesDataPoint[];

  @ApiProperty({ type: [TimeSeriesDataPoint] })
  hourlyPosts: TimeSeriesDataPoint[];

  @ApiProperty()
  growthRate: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

export class TopHashtagDto {
  @ApiProperty()
  hashtag: string;

  @ApiProperty()
  count: number;

  @ApiProperty()
  growth: number;
}

export class SentimentAnalyticsDto {
  @ApiProperty()
  overall: {
    positive: number;
    neutral: number;
    negative: number;
  };

  @ApiProperty()
  byPlatform: Array<{
    platformName: string;
    positive: number;
    neutral: number;
    negative: number;
  }>;

  @ApiProperty()
  trend: Array<{
    date: string;
    positive: number;
    neutral: number;
    negative: number;
  }>;
}

export class EngagementAnalyticsDto {
  @ApiProperty()
  totalPosts: number;

  @ApiProperty()
  totalLikes: number;

  @ApiProperty()
  totalComments: number;

  @ApiProperty()
  totalShares: number;

  @ApiProperty()
  totalViews: number;

  @ApiProperty()
  avgLikesPerPost: number;

  @ApiProperty()
  avgCommentsPerPost: number;

  @ApiProperty()
  avgSharesPerPost: number;

  @ApiProperty()
  avgEngagementPerPost: number;

  @ApiProperty()
  topEngagingPosts: Array<{
    id: string;
    content: string;
    engagementScore: number;
    platform: string;
    sentiment: string;
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    postedAt: string;
  }>;
}
