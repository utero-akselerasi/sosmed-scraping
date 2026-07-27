import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Platform } from '../../common/entities/platform.entity';
import { Post } from '../../common/entities/post.entity';
import { Influencer } from '../../common/entities/influencer.entity';
import { ScrapingJob, CollectionStatus } from '../../common/entities/scraping-job.entity';
import {
  PlatformResponseDto,
  PlatformStatsDto,
  PlatformOverviewDto,
} from './dto/platforms.dto';

@Injectable()
export class PlatformsService {
  constructor(
    @InjectRepository(Platform)
    private platformsRepository: Repository<Platform>,
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
    @InjectRepository(Influencer)
    private influencersRepository: Repository<Influencer>,
    @InjectRepository(ScrapingJob)
    private scrapingJobsRepository: Repository<ScrapingJob>,
  ) {}

  async getAllPlatforms(): Promise<PlatformResponseDto[]> {
    const platforms = await this.platformsRepository.find({
      order: { name: 'ASC' },
    });

    return platforms.map((platform) => this.transformToResponseDto(platform));
  }

  async getPlatformById(id: string): Promise<PlatformResponseDto> {
    const platform = await this.platformsRepository.findOne({
      where: { id },
    });

    if (!platform) {
      throw new NotFoundException(`Platform with ID ${id} not found`);
    }

    return this.transformToResponseDto(platform);
  }

  async getPlatformStats(id: string): Promise<PlatformStatsDto> {
    const platform = await this.platformsRepository.findOne({
      where: { id },
    });

    if (!platform) {
      throw new NotFoundException(`Platform with ID ${id} not found`);
    }

    // Get posts statistics
    const postStats = await this.postsRepository
      .createQueryBuilder('post')
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
      .where('post.platformId = :platformId', { platformId: id })
      .getRawOne();

    // Get total influencers
    const totalInfluencers = await this.influencersRepository.count({
      where: { platformId: id },
    });

    // Get last scraped time
    const lastJob = await this.scrapingJobsRepository.findOne({
      where: { platformId: id, status: CollectionStatus.COMPLETED },
      order: { completedAt: 'DESC' },
    });

    return {
      platformId: platform.id,
      platformName: platform.name,
      platformType: platform.type,
      totalPosts: parseInt(postStats.totalPosts) || 0,
      totalInfluencers,
      totalLikes: parseInt(postStats.totalLikes) || 0,
      totalComments: parseInt(postStats.totalComments) || 0,
      totalShares: parseInt(postStats.totalShares) || 0,
      totalViews: parseInt(postStats.totalViews) || 0,
      avgEngagementScore: parseFloat(postStats.avgEngagementScore) || 0,
      sentimentDistribution: {
        positive: parseInt(postStats.sentimentPositive) || 0,
        neutral: parseInt(postStats.sentimentNeutral) || 0,
        negative: parseInt(postStats.sentimentNegative) || 0,
      },
      lastScrapedAt: lastJob?.completedAt || null,
    };
  }

  async getPlatformOverview(): Promise<PlatformOverviewDto> {
    const platforms = await this.platformsRepository.find();

    const totalPlatforms = platforms.length;
    const activePlatforms = platforms.filter((p) => p.isActive).length;

    // Get overall statistics
    const totalPosts = await this.postsRepository.count();
    const totalInfluencers = await this.influencersRepository.count();

    // Get stats for each platform
    const platformStats = await Promise.all(
      platforms.map((platform) => this.getPlatformStats(platform.id)),
    );

    return {
      totalPlatforms,
      activePlatforms,
      totalPosts,
      totalInfluencers,
      platformStats,
    };
  }

  async togglePlatformStatus(id: string): Promise<PlatformResponseDto> {
    const platform = await this.platformsRepository.findOne({
      where: { id },
    });

    if (!platform) {
      throw new NotFoundException(`Platform with ID ${id} not found`);
    }

    platform.isActive = !platform.isActive;
    await this.platformsRepository.save(platform);

    return this.transformToResponseDto(platform);
  }

  private transformToResponseDto(platform: Platform): PlatformResponseDto {
    return {
      id: platform.id,
      name: platform.name,
      type: platform.type,
      isActive: platform.isActive,
      config: platform.config || {},
      createdAt: platform.createdAt,
      updatedAt: platform.updatedAt,
    };
  }
}
