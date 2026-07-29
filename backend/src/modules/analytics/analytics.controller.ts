import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  AnalyticsQueryDto,
  DashboardOverviewDto,
  TrendAnalyticsDto,
  TopHashtagDto,
  SentimentAnalyticsDto,
  EngagementAnalyticsDto,
} from './dto/analytics.dto';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get dashboard overview statistics' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard overview retrieved successfully',
    type: DashboardOverviewDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDashboardOverview(
    @Query() query: AnalyticsQueryDto,
  ): Promise<DashboardOverviewDto> {
    return this.analyticsService.getDashboardOverview(query);
  }

  @Get('trends')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get trend analytics (daily/hourly posts)' })
  @ApiResponse({
    status: 200,
    description: 'Trend analytics retrieved successfully',
    type: TrendAnalyticsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTrendAnalytics(
    @Query() query: AnalyticsQueryDto,
  ): Promise<TrendAnalyticsDto> {
    return this.analyticsService.getTrendAnalytics(query);
  }

  @Get('top-hashtags')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get top trending hashtags' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Top hashtags retrieved successfully',
    type: [TopHashtagDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTopHashtags(@Query('limit') limit?: number): Promise<TopHashtagDto[]> {
    return this.analyticsService.getTopHashtags(limit || 20);
  }

  @Get('sentiment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get sentiment analytics' })
  @ApiResponse({
    status: 200,
    description: 'Sentiment analytics retrieved successfully',
    type: SentimentAnalyticsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSentimentAnalytics(
    @Query() query: AnalyticsQueryDto,
  ): Promise<SentimentAnalyticsDto> {
    return this.analyticsService.getSentimentAnalytics(query);
  }

  @Get('engagement')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get engagement analytics' })
  @ApiResponse({
    status: 200,
    description: 'Engagement analytics retrieved successfully',
    type: EngagementAnalyticsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getEngagementAnalytics(
    @Query() query: AnalyticsQueryDto,
  ): Promise<EngagementAnalyticsDto> {
    return this.analyticsService.getEngagementAnalytics(query);
  }
}
