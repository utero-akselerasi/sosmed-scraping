import {
  Controller,
  Get,
  Query,
  Param,
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
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  GetPostsQueryDto,
  PostStatsDto,
  PostResponseDto,
  PaginatedPostsResponseDto,
} from './dto/posts.dto';

@ApiTags('Posts')
@Controller('posts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all posts with filters and pagination' })
  @ApiResponse({ 
    status: 200, 
    description: 'Posts retrieved successfully',
    type: PaginatedPostsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPosts(
    @Query() query: GetPostsQueryDto,
  ): Promise<PaginatedPostsResponseDto> {
    return this.postsService.getPosts(query);
  }

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get posts statistics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Statistics retrieved successfully',
    type: PostStatsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPostStats(@Query() query: GetPostsQueryDto): Promise<PostStatsDto> {
    return this.postsService.getPostStats(query);
  }

  @Get('top-hashtags')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get top trending hashtags' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of hashtags to return', example: 10 })
  @ApiResponse({ status: 200, description: 'Top hashtags retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTopHashtags(@Query('limit') limit?: number): Promise<any[]> {
    return this.postsService.getTopHashtags(limit || 10);
  }

  @Get('trending')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get trending posts (last 24 hours)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of posts to return', example: 10 })
  @ApiResponse({ 
    status: 200, 
    description: 'Trending posts retrieved successfully',
    type: [PostResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTrendingPosts(@Query('limit') limit?: number): Promise<PostResponseDto[]> {
    return this.postsService.getTrendingPosts(limit || 10);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get post by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Post retrieved successfully',
    type: PostResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPostById(@Param('id') id: string): Promise<PostResponseDto> {
    return this.postsService.getPostById(id);
  }
}
