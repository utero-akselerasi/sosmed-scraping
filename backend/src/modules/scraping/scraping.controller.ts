import {
  Controller,
  Get,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
  ConflictException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { ScrapingService } from "./scraping.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

@ApiTags("Scraping")
@Controller("scraping")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ScrapingController {
  constructor(private readonly scrapingService: ScrapingService) {}

  @Post("run")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Trigger manual scraping run" })
  @ApiResponse({ status: 202, description: "Scraping dimulai" })
  @ApiResponse({ status: 409, description: "Masih ada scraping berjalan" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async run() {
    const result = await this.scrapingService.trigger();
    if (result === "busy") {
      throw new ConflictException(
        "Masih ada proses scraping yang sedang berjalan.",
      );
    }
    return { message: "Scraping dimulai.", accepted: true };
  }

  @Get("status")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get scraping status (latest job per platform)" })
  @ApiResponse({ status: 200, description: "Status scraping" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async status() {
    return this.scrapingService.getStatus();
  }
}
