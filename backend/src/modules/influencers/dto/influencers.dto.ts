import {
  IsOptional,
  IsString,
  IsEnum,
  IsIn,
  IsInt,
  Min,
  Max,
} from "class-validator";
import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class GetInfluencersQueryDto {
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

  @ApiPropertyOptional({ description: "Search by username or name" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: "Sort by field",
    enum: ["followersCount", "engagementRate", "postsCount", "followers_count", "engagement_rate", "posts_count"],
    default: "engagementRate",
  })
  @IsOptional()
  @IsString()
  @IsIn(["followersCount", "engagementRate", "postsCount", "followers_count", "engagement_rate", "posts_count"])
  sortBy?: string = "engagementRate";

  @ApiPropertyOptional({
    description: "Sort order",
    enum: ["ASC", "DESC"],
    default: "DESC",
  })
  @IsOptional()
  @IsEnum(["ASC", "DESC"])
  sortOrder?: "ASC" | "DESC" = "DESC";
}

export class InfluencerResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  platformId: string;

  @ApiProperty()
  platformName: string;

  @ApiProperty()
  platformType: string;

  @ApiProperty()
  platformUserId: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  profilePictureUrl: string;

  @ApiProperty()
  bio: string;

  @ApiProperty()
  followersCount: number;

  @ApiProperty()
  followingCount: number;

  @ApiProperty()
  postsCount: number;

  @ApiProperty()
  engagementRate: number;

  @ApiProperty()
  isVerified: boolean;

  @ApiProperty()
  lastScrapedAt: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class InfluencerDetailDto extends InfluencerResponseDto {
  @ApiProperty()
  totalPosts: number;

  @ApiProperty()
  totalLikes: number;

  @ApiProperty()
  totalComments: number;

  @ApiProperty()
  totalShares: number;

  @ApiProperty()
  avgEngagementScore: number;

  @ApiProperty()
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export class PaginatedInfluencersResponseDto {
  @ApiProperty({ type: [InfluencerResponseDto] })
  data: InfluencerResponseDto[];

  @ApiProperty()
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class EngagementDataDto {
  @ApiProperty({ description: "Date of the data point" })
  date: string;

  @ApiProperty({ description: "Total likes on this date" })
  likes: number;

  @ApiProperty({ description: "Total comments on this date" })
  comments: number;

  @ApiProperty({ description: "Total shares on this date" })
  shares: number;

  @ApiProperty({ description: "Engagement score on this date" })
  engagementScore: number;
}

export class ContentTypeDistributionDto {
  @ApiProperty({ description: "Content type (e.g., image, video, carousel)" })
  type: string;

  @ApiProperty({ description: "Number of posts with this type" })
  count: number;

  @ApiProperty({ description: "Percentage of total posts" })
  percentage: number;
}
