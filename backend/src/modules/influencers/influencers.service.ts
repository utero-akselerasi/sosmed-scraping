import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Influencer } from "../../common/entities/influencer.entity";
import { Platform } from "../../common/entities/platform.entity";
import { Post } from "../../common/entities/post.entity";
import {
  GetInfluencersQueryDto,
  InfluencerResponseDto,
  InfluencerDetailDto,
  PaginatedInfluencersResponseDto,
  EngagementDataDto,
  ContentTypeDistributionDto,
} from "./dto/influencers.dto";

@Injectable()
export class InfluencersService {
  constructor(
    @InjectRepository(Influencer)
    private influencersRepository: Repository<Influencer>,
    @InjectRepository(Platform)
    private platformsRepository: Repository<Platform>,
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
  ) {}

  async getInfluencers(
    query: GetInfluencersQueryDto,
  ): Promise<PaginatedInfluencersResponseDto> {
    const {
      page = 1,
      limit = 20,
      platformId,
      search,
      sortBy = "engagement_rate",
      sortOrder = "DESC",
    } = query;

    // Build query
    const queryBuilder = this.influencersRepository
      .createQueryBuilder("influencer")
      .leftJoinAndSelect("influencer.platform", "platform");

    // Apply filters
    if (platformId) {
      queryBuilder.andWhere("influencer.platformId = :platformId", {
        platformId,
      });
    }

    if (search) {
      queryBuilder.andWhere(
        "(influencer.username ILIKE :search OR influencer.fullName ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    // Apply sorting - map snake_case DB columns to camelCase entity properties
    const sortFieldMap: Record<string, string> = {
      'followers_count': 'followersCount',
      'engagement_rate': 'engagementRate',
      'posts_count': 'postsCount',
    };
    const actualSortBy = sortFieldMap[sortBy] || sortBy;
    queryBuilder.orderBy(`influencer.${actualSortBy}`, sortOrder);

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Execute query
    const [influencers, total] = await queryBuilder.getManyAndCount();

    // Transform to response DTO
    const data = influencers.map((influencer) =>
      this.transformToResponseDto(influencer),
    );

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getInfluencerById(id: string): Promise<InfluencerDetailDto> {
    const influencer = await this.influencersRepository
      .createQueryBuilder("influencer")
      .leftJoinAndSelect("influencer.platform", "platform")
      .where("influencer.id = :id", { id })
      .getOne();

    if (!influencer) {
      throw new NotFoundException(`Influencer with ID ${id} not found`);
    }

    // Get post statistics
    const postStats = await this.postsRepository
      .createQueryBuilder("post")
      .select("COUNT(*)", "totalPosts")
      .addSelect("COALESCE(SUM(post.likesCount), 0)", "totalLikes")
      .addSelect("COALESCE(SUM(post.commentsCount), 0)", "totalComments")
      .addSelect("COALESCE(SUM(post.sharesCount), 0)", "totalShares")
      .addSelect("COALESCE(AVG(post.engagementScore), 0)", "avgEngagementScore")
      .addSelect(
        "COUNT(*) FILTER (WHERE post.sentiment = 'positive')",
        "sentimentPositive",
      )
      .addSelect(
        "COUNT(*) FILTER (WHERE post.sentiment = 'neutral')",
        "sentimentNeutral",
      )
      .addSelect(
        "COUNT(*) FILTER (WHERE post.sentiment = 'negative')",
        "sentimentNegative",
      )
      .where("post.influencerId = :influencerId", { influencerId: id })
      .getRawOne();

    return {
      ...this.transformToResponseDto(influencer),
      totalPosts: parseInt(postStats.totalPosts) || 0,
      totalLikes: parseInt(postStats.totalLikes) || 0,
      totalComments: parseInt(postStats.totalComments) || 0,
      totalShares: parseInt(postStats.totalShares) || 0,
      avgEngagementScore: parseFloat(postStats.avgEngagementScore) || 0,
      sentimentDistribution: {
        positive: parseInt(postStats.sentimentPositive) || 0,
        neutral: parseInt(postStats.sentimentNeutral) || 0,
        negative: parseInt(postStats.sentimentNegative) || 0,
      },
    };
  }

  async getTopInfluencers(
    limit: number = 10,
  ): Promise<InfluencerResponseDto[]> {
    const influencers = await this.influencersRepository
      .createQueryBuilder("influencer")
      .leftJoinAndSelect("influencer.platform", "platform")
      .orderBy("influencer.engagementRate", "DESC")
      .limit(limit)
      .getMany();

    return influencers.map((influencer) =>
      this.transformToResponseDto(influencer),
    );
  }

  async getTopInfluencersByPlatform(
    platformId: string,
    limit: number = 10,
  ): Promise<InfluencerResponseDto[]> {
    const influencers = await this.influencersRepository
      .createQueryBuilder("influencer")
      .leftJoinAndSelect("influencer.platform", "platform")
      .where("influencer.platformId = :platformId", { platformId })
      .orderBy("influencer.engagementRate", "DESC")
      .limit(limit)
      .getMany();

    return influencers.map((influencer) =>
      this.transformToResponseDto(influencer),
    );
  }

  async getInfluencerEngagement(
    influencerId: string,
    days: number = 30,
  ): Promise<EngagementDataDto[]> {
    // Verify influencer exists
    const influencer = await this.influencersRepository.findOne({
      where: { id: influencerId },
    });

    if (!influencer) {
      throw new NotFoundException(
        `Influencer with ID ${influencerId} not found`,
      );
    }

    // Get engagement data grouped by date
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const engagementData = await this.postsRepository
      .createQueryBuilder("post")
      .select("DATE(post.postedAt)", "date")
      .addSelect("COALESCE(SUM(post.likesCount), 0)", "likes")
      .addSelect("COALESCE(SUM(post.commentsCount), 0)", "comments")
      .addSelect("COALESCE(SUM(post.sharesCount), 0)", "shares")
      .addSelect("COALESCE(AVG(post.engagementScore), 0)", "engagementScore")
      .where("post.influencerId = :influencerId", { influencerId })
      .andWhere("post.postedAt >= :startDate", { startDate })
      .groupBy("DATE(post.postedAt)")
      .orderBy("DATE(post.postedAt)", "ASC")
      .getRawMany();

    return engagementData.map((data) => ({
      date: data.date,
      likes: parseInt(data.likes) || 0,
      comments: parseInt(data.comments) || 0,
      shares: parseInt(data.shares) || 0,
      engagementScore: parseFloat(data.engagementScore) || 0,
    }));
  }

  async getInfluencerContentTypes(
    influencerId: string,
  ): Promise<ContentTypeDistributionDto[]> {
    // Verify influencer exists
    const influencer = await this.influencersRepository.findOne({
      where: { id: influencerId },
    });

    if (!influencer) {
      throw new NotFoundException(
        `Influencer with ID ${influencerId} not found`,
      );
    }

    // Get total posts count
    const totalPosts = await this.postsRepository
      .createQueryBuilder("post")
      .where("post.influencerId = :influencerId", { influencerId })
      .getCount();

    if (totalPosts === 0) {
      return [];
    }

    // Get content type distribution
    // Note: contentType field might not exist in current schema
    // This is a placeholder implementation that uses post data patterns
    const contentTypeData = await this.postsRepository
      .createQueryBuilder("post")
      .select(
        "CASE " +
          "WHEN post.mediaUrls IS NOT NULL AND '%.mp4%' = ANY(post.mediaUrls) THEN 'video' " +
          "WHEN post.mediaUrls IS NOT NULL AND '%.jpg%' = ANY(post.mediaUrls) THEN 'image' " +
          "WHEN post.mediaUrls IS NOT NULL AND '%.png%' = ANY(post.mediaUrls) THEN 'image' " +
          "WHEN post.mediaUrls IS NOT NULL THEN 'media' " +
          "ELSE 'text' " +
          "END",
        "type",
      )
      .addSelect("COUNT(*)", "count")
      .where("post.influencerId = :influencerId", { influencerId })
      .groupBy("type")
      .orderBy("count", "DESC")
      .getRawMany();

    return contentTypeData.map((data) => {
      const count = parseInt(data.count) || 0;
      return {
        type: data.type,
        count,
        percentage: parseFloat(((count / totalPosts) * 100).toFixed(2)),
      };
    });
  }

  private transformToResponseDto(
    influencer: Influencer,
  ): InfluencerResponseDto {
    return {
      id: influencer.id,
      platformId: influencer.platformId,
      platformName: influencer.platform?.name || "",
      platformType: influencer.platform?.type || "",
      platformUserId: influencer.platformUserId,
      username: influencer.username,
      fullName: influencer.fullName || "",
      profilePictureUrl: influencer.profilePictureUrl || "",
      bio: influencer.bio || "",
      followersCount: influencer.followersCount || 0,
      followingCount: influencer.followingCount || 0,
      postsCount: influencer.postsCount || 0,
      engagementRate: parseFloat(influencer.engagementRate?.toString() || "0"),
      isVerified: influencer.isVerified || false,
      lastScrapedAt: influencer.lastScrapedAt,
      createdAt: influencer.createdAt,
      updatedAt: influencer.updatedAt,
    };
  }
}
