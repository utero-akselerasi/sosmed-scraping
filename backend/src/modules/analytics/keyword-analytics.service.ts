import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Post } from "../../common/entities/post.entity";
import { Influencer } from "../../common/entities/influencer.entity";
import { Platform } from "../../common/entities/platform.entity";

export interface KeywordOverviewDto {
  keyword: string;
  totalPosts: number;
  totalEngagement: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
    score: number;
  };
  avgEngagementScore: number;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  platforms: Array<{
    name: string;
    type: string;
    count: number;
  }>;
  dailyTrend: Array<{
    date: string;
    count: number;
    engagement: number;
  }>;
  growthRate: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  topPosts: Array<{
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
  }>;
  topInfluencers: Array<{
    id: string;
    username: string;
    fullName: string;
    profilePictureUrl: string;
    platformName: string;
    isVerified: boolean;
    postCount: number;
    totalEngagement: number;
  }>;
  recentPosts: Array<{
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
  }>;
  firstMentionAt: Date | null;
  lastMentionAt: Date | null;
}

@Injectable()
export class KeywordAnalyticsService {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
    @InjectRepository(Influencer)
    private influencersRepository: Repository<Influencer>,
    @InjectRepository(Platform)
    private platformsRepository: Repository<Platform>,
  ) {}

  async getKeywordOverview(keyword: string): Promise<KeywordOverviewDto> {
    const likeKeyword = `%${keyword}%`;

    // 1. Aggregated stats
    const stats = await this.postsRepository
      .createQueryBuilder("post")
      .select("COUNT(*)", "totalPosts")
      .addSelect("COALESCE(SUM(post.likesCount), 0)", "totalLikes")
      .addSelect("COALESCE(SUM(post.commentsCount), 0)", "totalComments")
      .addSelect("COALESCE(SUM(post.sharesCount), 0)", "totalShares")
      .addSelect("COALESCE(SUM(post.viewsCount), 0)", "totalViews")
      .addSelect("COALESCE(SUM(post.engagementScore), 0)", "totalScore")
      .addSelect("COALESCE(AVG(post.engagementScore), 0)", "avgEngagement")
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
      .where("post.content ILIKE :keyword", { keyword: likeKeyword })
      .getRawOne();

    const totalPosts = parseInt(stats.totalPosts) || 0;

    // 2. Platform distribution
    const platforms = await this.postsRepository
      .createQueryBuilder("post")
      .leftJoin("post.platform", "platform")
      .select("platform.name", "name")
      .addSelect("platform.type", "type")
      .addSelect("COUNT(*)", "count")
      .where("post.content ILIKE :keyword", { keyword: likeKeyword })
      .groupBy("platform.name")
      .addGroupBy("platform.type")
      .orderBy("count", "DESC")
      .getRawMany();

    // 3. Daily trend (last 30 days)
    const dailyTrend = await this.postsRepository
      .createQueryBuilder("post")
      .select("DATE(post.postedAt)", "date")
      .addSelect("COUNT(*)", "count")
      .addSelect("COALESCE(AVG(post.engagementScore), 0)", "engagement")
      .where("post.content ILIKE :keyword", { keyword: likeKeyword })
      .andWhere("post.postedAt >= NOW() - INTERVAL '30 days'")
      .groupBy("date")
      .orderBy("date", "ASC")
      .getRawMany();

    // 4. Growth rates
    const calculateGrowth = (current: number, previous: number): number =>
      previous > 0
        ? ((current - previous) / previous) * 100
        : current > 0
          ? 100
          : 0;

    const [posts24h, postsPrev24h, posts7d, postsPrev7d, posts30d, postsPrev30d] =
      await Promise.all([
        this.postsRepository
          .createQueryBuilder("post")
          .where("post.content ILIKE :keyword", { keyword: likeKeyword })
          .andWhere("post.postedAt >= NOW() - INTERVAL '24 hours'")
          .getCount(),
        this.postsRepository
          .createQueryBuilder("post")
          .where("post.content ILIKE :keyword", { keyword: likeKeyword })
          .andWhere("post.postedAt >= NOW() - INTERVAL '48 hours'")
          .andWhere("post.postedAt < NOW() - INTERVAL '24 hours'")
          .getCount(),
        this.postsRepository
          .createQueryBuilder("post")
          .where("post.content ILIKE :keyword", { keyword: likeKeyword })
          .andWhere("post.postedAt >= NOW() - INTERVAL '7 days'")
          .getCount(),
        this.postsRepository
          .createQueryBuilder("post")
          .where("post.content ILIKE :keyword", { keyword: likeKeyword })
          .andWhere("post.postedAt >= NOW() - INTERVAL '14 days'")
          .andWhere("post.postedAt < NOW() - INTERVAL '7 days'")
          .getCount(),
        this.postsRepository
          .createQueryBuilder("post")
          .where("post.content ILIKE :keyword", { keyword: likeKeyword })
          .andWhere("post.postedAt >= NOW() - INTERVAL '30 days'")
          .getCount(),
        this.postsRepository
          .createQueryBuilder("post")
          .where("post.content ILIKE :keyword", { keyword: likeKeyword })
          .andWhere("post.postedAt >= NOW() - INTERVAL '60 days'")
          .andWhere("post.postedAt < NOW() - INTERVAL '30 days'")
          .getCount(),
      ]);

    // 5. Top posts (by engagement)
    const topPosts = await this.postsRepository
      .createQueryBuilder("post")
      .leftJoinAndSelect("post.platform", "platform")
      .leftJoinAndSelect("post.influencer", "influencer")
      .where("post.content ILIKE :keyword", { keyword: likeKeyword })
      .orderBy("post.engagementScore", "DESC")
      .limit(5)
      .getMany();

    // 6. Top influencers (by engagement from keyword posts)
    const topInfluencers = await this.postsRepository
      .createQueryBuilder("post")
      .leftJoin("post.influencer", "influencer")
      .leftJoin("post.platform", "platform")
      .select("influencer.id", "id")
      .addSelect("influencer.username", "username")
      .addSelect("influencer.fullName", "fullName")
      .addSelect("influencer.profilePictureUrl", "profilePictureUrl")
      .addSelect("influencer.isVerified", "isVerified")
      .addSelect("platform.name", "platformName")
      .addSelect("COUNT(*)", "postCount")
      .addSelect(
        "COALESCE(SUM(post.likesCount + post.commentsCount * 2 + post.sharesCount * 3), 0)",
        "totalEngagement",
      )
      .where("post.content ILIKE :keyword", { keyword: likeKeyword })
      .groupBy("influencer.id")
      .addGroupBy("influencer.username")
      .addGroupBy("influencer.fullName")
      .addGroupBy("influencer.profilePictureUrl")
      .addGroupBy("influencer.isVerified")
      .addGroupBy("platform.name")
      .orderBy("totalEngagement", "DESC")
      .limit(10)
      .getRawMany();

    // 7. Recent posts
    const recentPosts = await this.postsRepository
      .createQueryBuilder("post")
      .leftJoinAndSelect("post.platform", "platform")
      .leftJoinAndSelect("post.influencer", "influencer")
      .where("post.content ILIKE :keyword", { keyword: likeKeyword })
      .orderBy("post.postedAt", "DESC")
      .limit(10)
      .getMany();

    // 8. First and last mention
    const dateRange = await this.postsRepository
      .createQueryBuilder("post")
      .select("MIN(post.postedAt)", "firstMention")
      .addSelect("MAX(post.postedAt)", "lastMention")
      .where("post.content ILIKE :keyword", { keyword: likeKeyword })
      .getRawOne();

    return {
      keyword,
      totalPosts,
      totalEngagement: {
        likes: parseInt(stats.totalLikes) || 0,
        comments: parseInt(stats.totalComments) || 0,
        shares: parseInt(stats.totalShares) || 0,
        views: parseInt(stats.totalViews) || 0,
        score: parseFloat(stats.totalScore) || 0,
      },
      avgEngagementScore: parseFloat(stats.avgEngagement) || 0,
      sentiment: {
        positive: parseInt(stats.positive) || 0,
        neutral: parseInt(stats.neutral) || 0,
        negative: parseInt(stats.negative) || 0,
      },
      platforms: platforms.map((p) => ({
        name: p.name,
        type: p.type,
        count: parseInt(p.count) || 0,
      })),
      dailyTrend: dailyTrend.map((item) => ({
        date: item.date,
        count: parseInt(item.count),
        engagement: parseFloat(item.engagement),
      })),
      growthRate: {
        daily: calculateGrowth(posts24h, postsPrev24h),
        weekly: calculateGrowth(posts7d, postsPrev7d),
        monthly: calculateGrowth(posts30d, postsPrev30d),
      },
      topPosts: topPosts.map((post) => ({
        id: post.id,
        platformId: post.platformId,
        platformName: post.platform?.name || "",
        platformType: post.platform?.type || "",
        influencerId: post.influencerId,
        influencerUsername: post.influencer?.username || "",
        influencerName: post.influencer?.fullName || "",
        platformPostId: post.platformPostId,
        postType: post.postType,
        content: post.content || "",
        mediaUrls: post.mediaUrls || [],
        postUrl: post.postUrl || "",
        likesCount: post.likesCount || 0,
        commentsCount: post.commentsCount || 0,
        sharesCount: post.sharesCount || 0,
        viewsCount: post.viewsCount || 0,
        engagementScore: parseFloat(
          post.engagementScore?.toString() || "0",
        ),
        sentiment: post.sentiment || "",
        sentimentScore: parseFloat(
          post.sentimentScore?.toString() || "0",
        ),
        hashtags: post.hashtags || [],
        mentions: post.mentions || [],
        location: post.location || "",
        postedAt: post.postedAt,
        scrapedAt: post.scrapedAt,
        createdAt: post.createdAt,
      })),
      topInfluencers: topInfluencers.map((inf) => ({
        id: inf.id,
        username: inf.username,
        fullName: inf.fullName || "",
        profilePictureUrl: inf.profilePictureUrl || "",
        platformName: inf.platformName || "",
        isVerified: inf.isVerified || false,
        postCount: parseInt(inf.postCount) || 0,
        totalEngagement: parseInt(inf.totalEngagement) || 0,
      })),
      recentPosts: recentPosts.map((post) => ({
        id: post.id,
        platformId: post.platformId,
        platformName: post.platform?.name || "",
        platformType: post.platform?.type || "",
        influencerId: post.influencerId,
        influencerUsername: post.influencer?.username || "",
        influencerName: post.influencer?.fullName || "",
        platformPostId: post.platformPostId,
        postType: post.postType,
        content: post.content || "",
        mediaUrls: post.mediaUrls || [],
        postUrl: post.postUrl || "",
        likesCount: post.likesCount || 0,
        commentsCount: post.commentsCount || 0,
        sharesCount: post.sharesCount || 0,
        viewsCount: post.viewsCount || 0,
        engagementScore: parseFloat(
          post.engagementScore?.toString() || "0",
        ),
        sentiment: post.sentiment || "",
        sentimentScore: parseFloat(
          post.sentimentScore?.toString() || "0",
        ),
        hashtags: post.hashtags || [],
        mentions: post.mentions || [],
        location: post.location || "",
        postedAt: post.postedAt,
        scrapedAt: post.scrapedAt,
        createdAt: post.createdAt,
      })),
      firstMentionAt: dateRange?.firstMention || null,
      lastMentionAt: dateRange?.lastMention || null,
    };
  }
}
