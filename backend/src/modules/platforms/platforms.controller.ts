import {
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PlatformsService } from './platforms.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/entities/user.entity';
import {
  PlatformResponseDto,
  PlatformStatsDto,
  PlatformOverviewDto,
} from './dto/platforms.dto';

@ApiTags('Platforms')
@Controller('platforms')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PlatformsController {
  constructor(private readonly platformsService: PlatformsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all platforms' })
  @ApiResponse({
    status: 200,
    description: 'Platforms retrieved successfully',
    type: [PlatformResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAllPlatforms(): Promise<PlatformResponseDto[]> {
    return this.platformsService.getAllPlatforms();
  }

  @Get('overview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get platforms overview with statistics' })
  @ApiResponse({
    status: 200,
    description: 'Overview retrieved successfully',
    type: PlatformOverviewDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPlatformOverview(): Promise<PlatformOverviewDto> {
    return this.platformsService.getPlatformOverview();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get platform by ID' })
  @ApiResponse({
    status: 200,
    description: 'Platform retrieved successfully',
    type: PlatformResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Platform not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPlatformById(@Param('id') id: string): Promise<PlatformResponseDto> {
    return this.platformsService.getPlatformById(id);
  }

  @Get(':id/stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get platform statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: PlatformStatsDto,
  })
  @ApiResponse({ status: 404, description: 'Platform not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPlatformStats(@Param('id') id: string): Promise<PlatformStatsDto> {
    return this.platformsService.getPlatformStats(id);
  }

  @Patch(':id/toggle')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle platform active status (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Platform status updated successfully',
    type: PlatformResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Platform not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async togglePlatformStatus(@Param('id') id: string): Promise<PlatformResponseDto> {
    return this.platformsService.togglePlatformStatus(id);
  }
}
