import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '../../common/entities/post.entity';
import { Platform } from '../../common/entities/platform.entity';
import { Influencer } from '../../common/entities/influencer.entity';
import {
  GetPostsQueryDto,
  PostStatsDto,
  PostResponseDto,
  PaginatedPostsResponseDto,
} from './dto/posts.dto';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
    @InjectRepository(Platform)
    private platformsRepository: Repository<Platform>,
    @InjectRepository(Influencer)
    private influencersRepository: Repository<Influencer>,
  ) {}

  async getPosts(query: GetPostsQueryDto): Promise<PaginatedPostsResponseDto> {
    const {
      page = 1,
      limit = 20,
      platformId,
      influencerId,
      postType,
      sentiment,
      search,
      hashtag,
      startDate,
      endDate,
      sortBy = 'posted_at',
      sortOrder = 'DESC',
    } = query;

    // Build query
    const queryBuilder = this.postsRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.platform', 'platform')
      .leftJoinAndSelect('post.influencer', 'influencer');

    // Apply filters
    if (platformId) {
      queryBuilder.andWhere('post.platformId = :platformId', { platformId });
    }

    if (influencerId) {
      queryBuilder.andWhere('post.influencerId = :influencerId', { influencerId });
    }

    if (postType) {
      queryBuilder.andWhere('post.postType = :postType', { postType });
    }

    if (sentiment) {
      queryBuilder.andWhere('post.sentiment = :sentiment', { sentiment });
    }

    if (search) {
      queryBuilder.andWhere('post.content ILIKE :search', { search: `%${search}%` });
    }

    if (hashtag) {
      queryBuilder.andWhere(':hashtag = ANY(post.hashtags)', { 
        hashtag: hashtag.startsWith('#') ? hashtag : `#${hashtag}` 
      });
    }

    if (startDate) {
      queryBuilder.andWhere('post.postedAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('post.postedAt <= :endDate', { endDate });
    }

    // Apply sorting
    const sortColumn = `post.${sortBy}`;
    queryBuilder.orderBy(sortColumn, sortOrder);

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Execute query
    const [posts, total] = await queryBuilder.getManyAndCount();

    // Transform to response DTO
    const data = posts.map((post) => this.transformToResponseDto(post));

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

  async getPostById(id: string): Promise<PostResponseDto> {
    const post = await this.postsRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.platform', 'platform')
      .leftJoinAndSelect('post.influencer', 'influencer')
      .where('post.id = :id', { id })
      .getOne();

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    return this.transformToResponseDto(post);
  }

  async getPostStats(query: GetPostsQueryDto): Promise<PostStatsDto> {
    const queryBuilder = this.postsRepository.createQueryBuilder('post');

    // Apply same filters as getPosts
    if (query.platformId) {
      queryBuilder.andWhere('post.platformId = :platformId', { platformId: query.platformId });
    }

    if (query.influencerId) {
      queryBuilder.andWhere('post.influencerId = :influencerId', { influencerId: query.influencerId });
    }

    if (query.postType) {
      queryBuilder.andWhere('post.postType = :postType', { postType: query.postType });
    }

    if (query.sentiment) {
      queryBuilder.andWhere('post.sentiment = :sentiment', { sentiment: query.sentiment });
    }

    if (query.search) {
      queryBuilder.andWhere('post.content ILIKE :search', { search: `%${query.search}%` });
    }

    if (query.hashtag) {
      queryBuilder.andWhere(':hashtag = ANY(post.hashtags)', { 
        hashtag: query.hashtag.startsWith('#') ? query.hashtag : `#${query.hashtag}` 
      });
    }

    if (query.startDate) {
      queryBuilder.andWhere('post.postedAt >= :startDate', { startDate: query.startDate });
    }

    if (query.endDate) {
      queryBuilder.andWhere('post.postedAt <= :endDate', { endDate: query.endDate });
    }

    // Get statistics
    const stats = await queryBuilder
      .select('COUNT(*)', 'totalPosts')
      .addSelect('COALESCE(SUM(post.likesCount), 0)', 'totalLikes')
      .addSelect('COALESCE(SUM(post.commentsCount), 0)', 'totalComments')
      .addSelect('COALESCE(SUM(post.sharesCount), 0)', 'totalShares')
      .addSelect('COALESCE(SUM(post.viewsCount), 0)', 'totalViews')
      .addSelect('COALESCE(AVG(post.engagementScore), 0)', 'avgEngagementScore')
      .addSelect(
        "COUNT(*) FILTER (WHERE post.sentiment = 'positive')",
        'sentimentPositive',
      )
      .addSelect(
        "COUNT(*) FILTER (WHERE post.sentiment = 'neutral')",
        'sentimentNeutral',
      )
      .addSelect(
        "COUNT(*) FILTER (WHERE post.sentiment = 'negative')",
        'sentimentNegative',
      )
      .getRawOne();

    return {
      totalPosts: parseInt(stats.totalPosts) || 0,
      totalLikes: parseInt(stats.totalLikes) || 0,
      totalComments: parseInt(stats.totalComments) || 0,
      totalShares: parseInt(stats.totalShares) || 0,
      totalViews: parseInt(stats.totalViews) || 0,
      avgEngagementScore: parseFloat(stats.avgEngagementScore) || 0,
      sentimentDistribution: {
        positive: parseInt(stats.sentimentPositive) || 0,
        neutral: parseInt(stats.sentimentNeutral) || 0,
        negative: parseInt(stats.sentimentNegative) || 0,
      },
    };
  }

  async getTopHashtags(limit: number = 10): Promise<any[]> {
    const result = await this.postsRepository
      .createQueryBuilder('post')
      .select('unnest(post.hashtags)', 'hashtag')
      .addSelect('COUNT(*)', 'count')
      .groupBy('hashtag')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();

    return result.map((item) => ({
      hashtag: item.hashtag,
      count: parseInt(item.count),
    }));
  }

  async getTrendingPosts(limit: number = 10): Promise<PostResponseDto[]> {
    const posts = await this.postsRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.platform', 'platform')
      .leftJoinAndSelect('post.influencer', 'influencer')
      .where('post.postedAt >= NOW() - INTERVAL \'24 hours\'')
      .orderBy('post.engagementScore', 'DESC')
      .limit(limit)
      .getMany();

    return posts.map((post) => this.transformToResponseDto(post));
  }

  private transformToResponseDto(post: Post): PostResponseDto {
    return {
      id: post.id,
      platformId: post.platformId,
      platformName: post.platform?.name || '',
      platformType: post.platform?.type || '',
      influencerId: post.influencerId,
      influencerUsername: post.influencer?.username || '',
      influencerName: post.influencer?.fullName || '',
      platformPostId: post.platformPostId,
      postType: post.postType,
      content: post.content || '',
      mediaUrls: post.mediaUrls || [],
      postUrl: post.postUrl || '',
      likesCount: post.likesCount || 0,
      commentsCount: post.commentsCount || 0,
      sharesCount: post.sharesCount || 0,
      viewsCount: post.viewsCount || 0,
      engagementScore: parseFloat(post.engagementScore?.toString() || '0'),
      sentiment: post.sentiment || '',
      sentimentScore: parseFloat(post.sentimentScore?.toString() || '0'),
      hashtags: post.hashtags || [],
      mentions: post.mentions || [],
      location: post.location || '',
      postedAt: post.postedAt,
      scrapedAt: post.scrapedAt,
      createdAt: post.createdAt,
    };
  }
}
