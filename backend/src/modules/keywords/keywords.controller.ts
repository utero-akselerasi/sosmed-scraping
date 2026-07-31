import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { KeywordsService } from "./keywords.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserRole } from "../../common/entities/user.entity";
import {
  CreateKeywordDto,
  UpdateKeywordDto,
  KeywordResponseDto,
  GetKeywordsQueryDto,
  PaginatedKeywordsResponseDto,
} from "./dto/keywords.dto";

@ApiTags("Keywords")
@Controller("keywords")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class KeywordsController {
  constructor(private readonly keywordsService: KeywordsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Create new keyword (Admin only)" })
  @ApiResponse({
    status: 201,
    description: "Keyword created successfully",
    type: KeywordResponseDto,
  })
  @ApiResponse({ status: 409, description: "Keyword already exists" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  async create(
    @Body() createKeywordDto: CreateKeywordDto,
  ): Promise<KeywordResponseDto> {
    return this.keywordsService.create(createKeywordDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get all keywords with pagination" })
  @ApiResponse({
    status: 200,
    description: "Keywords retrieved successfully",
    type: PaginatedKeywordsResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async findAll(
    @Query() query: GetKeywordsQueryDto,
  ): Promise<PaginatedKeywordsResponseDto> {
    return this.keywordsService.findAll(query);
  }

  @Get("active")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get all active keywords" })
  @ApiResponse({
    status: 200,
    description: "Active keywords retrieved successfully",
    type: [KeywordResponseDto],
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getActiveKeywords(): Promise<KeywordResponseDto[]> {
    return this.keywordsService.getActiveKeywords();
  }

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get keyword by ID" })
  @ApiResponse({
    status: 200,
    description: "Keyword retrieved successfully",
    type: KeywordResponseDto,
  })
  @ApiResponse({ status: 404, description: "Keyword not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async findOne(@Param("id") id: string): Promise<KeywordResponseDto> {
    return this.keywordsService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update keyword (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Keyword updated successfully",
    type: KeywordResponseDto,
  })
  @ApiResponse({ status: 404, description: "Keyword not found" })
  @ApiResponse({ status: 409, description: "Keyword already exists" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  async update(
    @Param("id") id: string,
    @Body() updateKeywordDto: UpdateKeywordDto,
  ): Promise<KeywordResponseDto> {
    return this.keywordsService.update(id, updateKeywordDto);
  }

  @Patch(":id/toggle")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Toggle keyword active status (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Keyword status toggled successfully",
    type: KeywordResponseDto,
  })
  @ApiResponse({ status: 404, description: "Keyword not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  async toggleActive(@Param("id") id: string): Promise<KeywordResponseDto> {
    return this.keywordsService.toggleActive(id);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete keyword (Admin only)" })
  @ApiResponse({ status: 204, description: "Keyword deleted successfully" })
  @ApiResponse({ status: 404, description: "Keyword not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  async remove(@Param("id") id: string): Promise<void> {
    return this.keywordsService.remove(id);
  }
}
