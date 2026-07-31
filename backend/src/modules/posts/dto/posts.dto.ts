import {
  IsOptional,
  IsString,
  IsEnum,
  IsIn,
  IsDateString,
  IsInt,
  Min,
  Max,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { SentimentType, PostType } from "../../../common/entities/post.entity";

export class GetPostsQueryDto {
  @ApiPropertyOptional({ description: "Page number", default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Items per page",
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: "Platform ID filter" })
  @IsOptional()
  @IsString()
  platformId?: string;

  @ApiPropertyOptional({ description: "Influencer ID filter" })
  @IsOptional()
  @IsString()
  influencerId?: string;

  @ApiPropertyOptional({ enum: PostType, description: "Post type filter" })
  @IsOptional()
  @IsEnum(PostType)
  postType?: PostType;

  @ApiPropertyOptional({ enum: SentimentType, description: "Sentiment filter" })
  @IsOptional()
  @IsEnum(SentimentType)
  sentiment?: SentimentType;

  @ApiPropertyOptional({ description: "Search in content" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Search by hashtag (without #)" })
  @IsOptional()
  @IsString()
  hashtag?: string;

  @ApiPropertyOptional({ description: "Start date (ISO 8601)" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: "End date (ISO 8601)" })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: "Sort by field",
    enum: ["postedAt", "engagementScore", "likesCount", "commentsCount"],
    default: "postedAt",
  })
  @IsOptional()
  @IsString()
  @IsIn(["postedAt", "engagementScore", "likesCount", "commentsCount"])
  sortBy?: string = "postedAt";

  @ApiPropertyOptional({
    description: "Sort order",
    enum: ["ASC", "DESC"],
    default: "DESC",
  })
  @IsOptional()
  @IsEnum(["ASC", "DESC"])
  sortOrder?: "ASC" | "DESC" = "DESC";
}

export class PostStatsDto {
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

export class PostResponseDto {
  id: string;
  platformId: string;
  platformName: string;
  platformType: string;
  influencerId: string;
  influencerUsername: string;
  influencerName: string;
  platformPostId: string;
  postType: string;
  content: string;
  mediaUrls: string[];
  postUrl: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  engagementScore: number;
  sentiment: string;
  sentimentScore: number;
  hashtags: string[];
  mentions: string[];
  location: string;
  postedAt: Date;
  scrapedAt: Date;
  createdAt: Date;
}

export class PaginatedPostsResponseDto {
  data: PostResponseDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
