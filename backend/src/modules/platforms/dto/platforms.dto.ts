import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlatformResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  config: Record<string, any>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PlatformStatsDto {
  @ApiProperty()
  platformId: string;

  @ApiProperty()
  platformName: string;

  @ApiProperty()
  platformType: string;

  @ApiProperty()
  totalPosts: number;

  @ApiProperty()
  totalInfluencers: number;

  @ApiProperty()
  totalLikes: number;

  @ApiProperty()
  totalComments: number;

  @ApiProperty()
  totalShares: number;

  @ApiProperty()
  totalViews: number;

  @ApiProperty()
  avgEngagementScore: number;

  @ApiProperty()
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };

  @ApiProperty()
  lastScrapedAt: Date;
}

export class PlatformOverviewDto {
  @ApiProperty()
  totalPlatforms: number;

  @ApiProperty()
  activePlatforms: number;

  @ApiProperty()
  totalPosts: number;

  @ApiProperty()
  totalInfluencers: number;

  @ApiProperty({ type: [PlatformStatsDto] })
  platformStats: PlatformStatsDto[];
}
