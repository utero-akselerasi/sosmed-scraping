import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { InfluencersService } from "./influencers.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import {
  GetInfluencersQueryDto,
  InfluencerResponseDto,
  InfluencerDetailDto,
  PaginatedInfluencersResponseDto,
  EngagementDataDto,
  ContentTypeDistributionDto,
} from "./dto/influencers.dto";

@ApiTags("Influencers")
@Controller("influencers")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InfluencersController {
  constructor(private readonly influencersService: InfluencersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get all influencers with filters and pagination" })
  @ApiResponse({
    status: 200,
    description: "Influencers retrieved successfully",
    type: PaginatedInfluencersResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getInfluencers(
    @Query() query: GetInfluencersQueryDto,
  ): Promise<PaginatedInfluencersResponseDto> {
    return this.influencersService.getInfluencers(query);
  }

  @Get("top")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get top influencers by engagement rate" })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Number of influencers",
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: "Top influencers retrieved successfully",
    type: [InfluencerResponseDto],
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getTopInfluencers(
    @Query("limit") limit?: number,
  ): Promise<InfluencerResponseDto[]> {
    return this.influencersService.getTopInfluencers(limit || 10);
  }

  @Get("platform/:platformId/top")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get top influencers by platform" })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Number of influencers",
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: "Top influencers retrieved successfully",
    type: [InfluencerResponseDto],
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getTopInfluencersByPlatform(
    @Param("platformId") platformId: string,
    @Query("limit") limit?: number,
  ): Promise<InfluencerResponseDto[]> {
    return this.influencersService.getTopInfluencersByPlatform(
      platformId,
      limit || 10,
    );
  }

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get influencer details by ID" })
  @ApiResponse({
    status: 200,
    description: "Influencer retrieved successfully",
    type: InfluencerDetailDto,
  })
  @ApiResponse({ status: 404, description: "Influencer not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getInfluencerById(
    @Param("id") id: string,
  ): Promise<InfluencerDetailDto> {
    return this.influencersService.getInfluencerById(id);
  }

  @Get(":id/engagement")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get influencer engagement time-series data" })
  @ApiQuery({
    name: "days",
    required: false,
    type: Number,
    description: "Number of days to fetch",
    example: 30,
  })
  @ApiResponse({
    status: 200,
    description: "Engagement data retrieved successfully",
    type: [EngagementDataDto],
  })
  @ApiResponse({ status: 404, description: "Influencer not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getInfluencerEngagement(
    @Param("id") id: string,
    @Query("days") days?: number,
  ): Promise<EngagementDataDto[]> {
    return this.influencersService.getInfluencerEngagement(id, days || 30);
  }

  @Get(":id/content-types")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get influencer content type distribution" })
  @ApiResponse({
    status: 200,
    description: "Content type distribution retrieved successfully",
    type: [ContentTypeDistributionDto],
  })
  @ApiResponse({ status: 404, description: "Influencer not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getInfluencerContentTypes(
    @Param("id") id: string,
  ): Promise<ContentTypeDistributionDto[]> {
    return this.influencersService.getInfluencerContentTypes(id);
  }
}
