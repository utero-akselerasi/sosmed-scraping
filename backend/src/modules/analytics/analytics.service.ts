import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, MoreThanOrEqual, SelectQueryBuilder } from "typeorm";
import { Post } from "../../common/entities/post.entity";
import { Influencer } from "../../common/entities/influencer.entity";
import { Platform } from "../../common/entities/platform.entity";
import {
  AnalyticsQueryDto,
  DashboardOverviewDto,
  TrendAnalyticsDto,
  TopHashtagDto,
  SentimentAnalyticsDto,
  EngagementAnalyticsDto,
} from "./dto/analytics.dto";

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
    @InjectRepository(Influencer)
    private influencersRepository: Repository<Influencer>,
    @InjectRepository(Platform)
    private platformsRepository: Repository<Platform>,
  ) {}

  async getDashboardOverview(
    query: AnalyticsQueryDto,
  ): Promise<DashboardOverviewDto> {
    const queryBuilder = this.postsRepository.createQueryBuilder("post");

    // Apply date filters
    if (query.startDate) {
      queryBuilder.andWhere("post.postedAt >= :startDate", {
        startDate: query.startDate,
      });
    }
    if (query.endDate) {
      queryBuilder.andWhere("post.postedAt <= :endDate", {
        endDate: query.endDate,
      });
    }
    if (query.platformId) {
      queryBuilder.andWhere("post.platformId = :platformId", {
        platformId: query.platformId,
      });
    }
    if (query.keyword) {
      queryBuilder.andWhere("post.content ILIKE :keyword", {
        keyword: `%${query.keyword}%`,
      });
    }

    // Get overall statistics
    const stats = await queryBuilder
      .select("COUNT(*)", "totalPosts")
      .addSelect(
        "COALESCE(SUM(post.likesCount + post.commentsCount + post.sharesCount), 0)",
        "totalEngagement",
      )
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
      .getRawOne();

    const totalPosts = parseInt(stats.totalPosts) || 0;
    const sentimentPositive = parseInt(stats.sentimentPositive) || 0;
    const sentimentNeutral = parseInt(stats.sentimentNeutral) || 0;
    const sentimentNegative = parseInt(stats.sentimentNegative) || 0;

    // Get total influencers
    const totalInfluencers = await this.influencersRepository.count();

    // Get total platforms
    const totalPlatforms = await this.platformsRepository.count({
      where: { isActive: true },
    });

    // Get top platform
    const topPlatform = await this.postsRepository
      .createQueryBuilder("post")
      .leftJoin("post.platform", "platform")
      .select("platform.name", "name")
      .addSelect("COUNT(*)", "count")
      .groupBy("platform.name")
      .orderBy("count", "DESC")
      .limit(1)
      .getRawOne();

    // Get recent activity
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [count24h, count7d, count30d] = await Promise.all([
      this.postsRepository.count({
        where: { postedAt: MoreThanOrEqual(last24Hours) },
      }),
      this.postsRepository.count({
        where: { postedAt: MoreThanOrEqual(last7Days) },
      }),
      this.postsRepository.count({
        where: { postedAt: MoreThanOrEqual(last30Days) },
      }),
    ]);

    return {
      totalPosts,
      totalInfluencers,
      totalPlatforms,
      totalEngagement: parseInt(stats.totalEngagement) || 0,
      avgEngagementScore: parseFloat(stats.avgEngagementScore) || 0,
      sentimentDistribution: {
        positive: sentimentPositive,
        neutral: sentimentNeutral,
        negative: sentimentNegative,
        positivePercentage:
          totalPosts > 0 ? (sentimentPositive / totalPosts) * 100 : 0,
        neutralPercentage:
          totalPosts > 0 ? (sentimentNeutral / totalPosts) * 100 : 0,
        negativePercentage:
          totalPosts > 0 ? (sentimentNegative / totalPosts) * 100 : 0,
      },
      topPlatform: {
        name: topPlatform?.name || "N/A",
        postsCount: parseInt(topPlatform?.count) || 0,
      },
      recentActivity: {
        last24Hours: count24h,
        last7Days: count7d,
        last30Days: count30d,
      },
    };
  }

  private applyDateFilters(
    qb: SelectQueryBuilder<Post>,
    query: AnalyticsQueryDto,
    alias = "post",
  ): void {
    if (query.startDate) {
      qb.andWhere(`${alias}.postedAt >= :startDate`, {
        startDate: query.startDate,
      });
    }
    if (query.endDate) {
      qb.andWhere(`${alias}.postedAt <= :endDate`, {
        endDate: query.endDate,
      });
    }
    if (query.platformId) {
      qb.andWhere(`${alias}.platformId = :platformId`, {
        platformId: query.platformId,
      });
    }
    if (query.keyword) {
      qb.andWhere(`${alias}.content ILIKE :keyword`, {
        keyword: `%${query.keyword}%`,
      });
    }
  }

  async getTrendAnalytics(
    query: AnalyticsQueryDto,
  ): Promise<TrendAnalyticsDto> {
    const startDate =
      query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = query.endDate || new Date().toISOString();

    // Get daily posts
    const dailyQb = this.postsRepository
      .createQueryBuilder("post")
      .select("DATE(post.postedAt)", "date")
      .addSelect("COUNT(*)", "count")
      .addSelect("COALESCE(AVG(post.engagementScore), 0)", "engagement")
      .addSelect("COALESCE(SUM(post.likesCount), 0)", "likes")
      .addSelect("COALESCE(SUM(post.commentsCount), 0)", "comments")
      .addSelect("COALESCE(SUM(post.sharesCount), 0)", "shares")
      .where("post.postedAt >= :startDate", { startDate })
      .andWhere("post.postedAt <= :endDate", { endDate });
    if (query.platformId) {
      dailyQb.andWhere("post.platformId = :platformId", {
        platformId: query.platformId,
      });
    }
    if (query.keyword) {
      dailyQb.andWhere("post.content ILIKE :keyword", {
        keyword: `%${query.keyword}%`,
      });
    }
    const dailyPosts = await dailyQb
      .groupBy("date")
      .orderBy("date", "ASC")
      .getRawMany();

    // Get hourly posts for the last 24 hours
    const hourlyQb = this.postsRepository
      .createQueryBuilder("post")
      .select("DATE_TRUNC('hour', post.postedAt)", "date")
      .addSelect("COUNT(*)", "count")
      .addSelect("COALESCE(AVG(post.engagementScore), 0)", "engagement")
      .where("post.postedAt >= NOW() - INTERVAL '24 hours'");
    if (query.platformId) {
      hourlyQb.andWhere("post.platformId = :platformId", {
        platformId: query.platformId,
      });
    }
    if (query.keyword) {
      hourlyQb.andWhere("post.content ILIKE :keyword", {
        keyword: `%${query.keyword}%`,
      });
    }
    const hourlyPosts = await hourlyQb
      .groupBy("date")
      .orderBy("date", "ASC")
      .getRawMany();

    // Calculate growth rates
    const growthFilter = (qb: SelectQueryBuilder<Post>) => {
      if (query.platformId) {
        qb.andWhere("post.platformId = :platformId", {
          platformId: query.platformId,
        });
      }
      if (query.keyword) {
        qb.andWhere("post.content ILIKE :keyword", {
          keyword: `%${query.keyword}%`,
        });
      }
    };

    const growthQb24h = this.postsRepository
      .createQueryBuilder("post")
      .where("post.postedAt >= NOW() - INTERVAL '24 hours'");
    growthFilter(growthQb24h);
    const postsLast24Hours = await growthQb24h.getCount();

    const growthQbPrev24h = this.postsRepository
      .createQueryBuilder("post")
      .where("post.postedAt >= NOW() - INTERVAL '48 hours'")
      .andWhere("post.postedAt < NOW() - INTERVAL '24 hours'");
    growthFilter(growthQbPrev24h);
    const postsPrevious24Hours = await growthQbPrev24h.getCount();

    const growthQb7d = this.postsRepository
      .createQueryBuilder("post")
      .where("post.postedAt >= NOW() - INTERVAL '7 days'");
    growthFilter(growthQb7d);
    const postsLast7Days = await growthQb7d.getCount();

    const growthQb14d = this.postsRepository
      .createQueryBuilder("post")
      .where("post.postedAt >= NOW() - INTERVAL '14 days'")
      .andWhere("post.postedAt < NOW() - INTERVAL '7 days'");
    growthFilter(growthQb14d);
    const postsLast14Days = await growthQb14d.getCount();

    const growthQb30d = this.postsRepository
      .createQueryBuilder("post")
      .where("post.postedAt >= NOW() - INTERVAL '30 days'");
    growthFilter(growthQb30d);
    const postsLast30Days = await growthQb30d.getCount();

    const growthQbPrev30d = this.postsRepository
      .createQueryBuilder("post")
      .where("post.postedAt >= NOW() - INTERVAL '60 days'")
      .andWhere("post.postedAt < NOW() - INTERVAL '30 days'");
    growthFilter(growthQbPrev30d);
    const postsPrevious30Days = await growthQbPrev30d.getCount();

    const calculateGrowth = (current: number, previous: number): number =>
      previous > 0
        ? ((current - previous) / previous) * 100
        : current > 0
          ? 100
          : 0;

    return {
      dailyPosts: dailyPosts.map((item) => ({
        date: item.date,
        count: parseInt(item.count),
        engagement: parseFloat(item.engagement),
        likes: parseInt(item.likes),
        comments: parseInt(item.comments),
        shares: parseInt(item.shares),
      })),
      hourlyPosts: hourlyPosts.map((item) => ({
        date: item.date,
        count: parseInt(item.count),
        engagement: parseFloat(item.engagement),
      })),
      growthRate: {
        daily: calculateGrowth(postsLast24Hours, postsPrevious24Hours),
        weekly: calculateGrowth(postsLast7Days, postsLast14Days),
        monthly: calculateGrowth(postsLast30Days, postsPrevious30Days),
      },
    };
  }

  async getTopHashtags(limit: number = 20): Promise<TopHashtagDto[]> {
    const currentHashtags = await this.postsRepository
      .createQueryBuilder("post")
      .select("unnest(post.hashtags)", "hashtag")
      .addSelect("COUNT(*)", "count")
      .where("post.postedAt >= NOW() - INTERVAL '7 days'")
      .groupBy("hashtag")
      .orderBy("count", "DESC")
      .limit(limit * 2)
      .getRawMany();

    const previousHashtags = await this.postsRepository
      .createQueryBuilder("post")
      .select("unnest(post.hashtags)", "hashtag")
      .addSelect("COUNT(*)", "count")
      .where("post.postedAt >= NOW() - INTERVAL '14 days'")
      .andWhere("post.postedAt < NOW() - INTERVAL '7 days'")
      .groupBy("hashtag")
      .getRawMany();

    const previousMap = new Map<string, number>();
    for (const item of previousHashtags) {
      previousMap.set(item.hashtag, parseInt(item.count));
    }

    return currentHashtags.slice(0, limit).map((item) => {
      const count = parseInt(item.count);
      const prevCount = previousMap.get(item.hashtag) || 0;
      const growth =
        prevCount > 0
          ? ((count - prevCount) / prevCount) * 100
          : count > 0
            ? 100
            : 0;
      return {
        hashtag: item.hashtag,
        count,
        growth: Math.round(growth * 100) / 100,
      };
    });
  }

  async getSentimentAnalytics(
    query: AnalyticsQueryDto,
  ): Promise<SentimentAnalyticsDto> {
    // Overall sentiment
    const overallQb = this.postsRepository
      .createQueryBuilder("post")
      .select("COUNT(*) FILTER (WHERE post.sentiment = 'positive')", "positive")
      .addSelect(
        "COUNT(*) FILTER (WHERE post.sentiment = 'neutral')",
        "neutral",
      )
      .addSelect(
        "COUNT(*) FILTER (WHERE post.sentiment = 'negative')",
        "negative",
      );
    this.applyDateFilters(overallQb, query);
    const overall = await overallQb.getRawOne();

    // Sentiment by platform
    const byPlatformQb = this.postsRepository
      .createQueryBuilder("post")
      .leftJoin("post.platform", "platform")
      .select("platform.name", "platformName")
      .addSelect(
        "COUNT(*) FILTER (WHERE post.sentiment = 'positive')",
        "positive",
      )
      .addSelect(
        "COUNT(*) FILTER (WHERE post.sentiment = 'neutral')",
        "neutral",
      )
      .addSelect(
        "COUNT(*) FILTER (WHERE post.sentiment = 'negative')",
        "negative",
      );
    this.applyDateFilters(byPlatformQb, query);
    const byPlatform = await byPlatformQb
      .groupBy("platform.name")
      .getRawMany();

    // Sentiment trend (last 7 days, or filtered range)
    const trendStartDate =
      query.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const trendEndDate = query.endDate || new Date().toISOString();
    const trendQb = this.postsRepository
      .createQueryBuilder("post")
      .select("DATE(post.postedAt)", "date")
      .addSelect(
        "COUNT(*) FILTER (WHERE post.sentiment = 'positive')",
        "positive",
      )
      .addSelect(
        "COUNT(*) FILTER (WHERE post.sentiment = 'neutral')",
        "neutral",
      )
      .addSelect(
        "COUNT(*) FILTER (WHERE post.sentiment = 'negative')",
        "negative",
      )
      .where("post.postedAt >= :startDate", { startDate: trendStartDate })
      .andWhere("post.postedAt <= :endDate", { endDate: trendEndDate });
    if (query.platformId) {
      trendQb.andWhere("post.platformId = :platformId", {
        platformId: query.platformId,
      });
    }
    if (query.keyword) {
      trendQb.andWhere("post.content ILIKE :keyword", {
        keyword: `%${query.keyword}%`,
      });
    }
    const trend = await trendQb
      .groupBy("date")
      .orderBy("date", "ASC")
      .getRawMany();

    return {
      overall: {
        positive: parseInt(overall.positive) || 0,
        neutral: parseInt(overall.neutral) || 0,
        negative: parseInt(overall.negative) || 0,
      },
      byPlatform: byPlatform.map((item) => ({
        platformName: item.platformName,
        positive: parseInt(item.positive) || 0,
        neutral: parseInt(item.neutral) || 0,
        negative: parseInt(item.negative) || 0,
      })),
      trend: trend.map((item) => ({
        date: item.date,
        positive: parseInt(item.positive) || 0,
        neutral: parseInt(item.neutral) || 0,
        negative: parseInt(item.negative) || 0,
      })),
    };
  }

  async getEngagementAnalytics(
    query: AnalyticsQueryDto,
  ): Promise<EngagementAnalyticsDto> {
    const statsQb = this.postsRepository
      .createQueryBuilder("post")
      .select("COUNT(*)", "totalPosts")
      .addSelect("COALESCE(SUM(post.likesCount), 0)", "totalLikes")
      .addSelect("COALESCE(SUM(post.commentsCount), 0)", "totalComments")
      .addSelect("COALESCE(SUM(post.sharesCount), 0)", "totalShares")
      .addSelect("COALESCE(SUM(post.viewsCount), 0)", "totalViews");
    this.applyDateFilters(statsQb, query);
    const stats = await statsQb.getRawOne();

    const totalPosts = parseInt(stats.totalPosts) || 1;

    // Get top engaging posts
    const topPostsQb = this.postsRepository
      .createQueryBuilder("post")
      .leftJoinAndSelect("post.platform", "platform")
      .orderBy("post.engagementScore", "DESC")
      .limit(10);
    this.applyDateFilters(topPostsQb, query);
    const topPosts = await topPostsQb.getMany();

    const totalLikes = parseInt(stats.totalLikes) || 0;
    const totalComments = parseInt(stats.totalComments) || 0;
    const totalShares = parseInt(stats.totalShares) || 0;

    return {
      totalPosts: parseInt(stats.totalPosts) || 0,
      totalLikes,
      totalComments,
      totalShares,
      totalViews: parseInt(stats.totalViews) || 0,
      avgLikesPerPost: totalLikes / totalPosts,
      avgCommentsPerPost: totalComments / totalPosts,
      avgSharesPerPost: totalShares / totalPosts,
      avgEngagementPerPost:
        (totalLikes + totalComments + totalShares) / totalPosts,
      topEngagingPosts: topPosts.map((post) => ({
        id: post.id,
        content: post.content?.substring(0, 100) || "",
        engagementScore: parseFloat(post.engagementScore?.toString() || "0"),
        platform: post.platform?.name || "",
        sentiment: post.sentiment || "neutral",
        likesCount: post.likesCount || 0,
        commentsCount: post.commentsCount || 0,
        sharesCount: post.sharesCount || 0,
        postedAt: post.postedAt?.toISOString() || "",
      })),
    };
  }
}
