import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { KeywordAnalyticsService } from "./keyword-analytics.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

@ApiTags("Keyword Analytics")
@Controller("analytics/keyword")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class KeywordAnalyticsController {
  constructor(
    private readonly keywordAnalyticsService: KeywordAnalyticsService,
  ) {}

  @Get("overview")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get keyword monitoring overview" })
  @ApiQuery({
    name: "keyword",
    required: true,
    type: String,
    description: "Keyword to analyze",
  })
  @ApiResponse({
    status: 200,
    description: "Keyword overview retrieved successfully",
  })
  @ApiResponse({ status: 400, description: "Keyword parameter is required" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getKeywordOverview(@Query("keyword") keyword: string) {
    if (!keyword || !keyword.trim()) {
      throw new BadRequestException("Keyword parameter is required");
    }
    return this.keywordAnalyticsService.getKeywordOverview(keyword.trim());
  }
}
