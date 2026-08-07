import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Keyword } from "../../common/entities/keyword.entity";
import {
  CreateKeywordDto,
  UpdateKeywordDto,
  KeywordResponseDto,
  GetKeywordsQueryDto,
  PaginatedKeywordsResponseDto,
} from "./dto/keywords.dto";

@Injectable()
export class KeywordsService {
  constructor(
    @InjectRepository(Keyword)
    private keywordsRepository: Repository<Keyword>,
  ) {}

  async create(
    createKeywordDto: CreateKeywordDto,
  ): Promise<KeywordResponseDto> {
    const { keyword, priority } = createKeywordDto;

    // Trim whitespace
    const trimmedKeyword = keyword.trim();

    // Validate: prevent empty or whitespace-only keywords
    if (!trimmedKeyword) {
      throw new ConflictException("Keyword cannot be empty or whitespace only");
    }

    // Validate: prevent extremely long keywords
    if (trimmedKeyword.length > 255) {
      throw new ConflictException("Keyword is too long (max 255 characters)");
    }

    // Check if keyword already exists (case-insensitive)
    const existing = await this.keywordsRepository.findOne({
      where: { keyword: trimmedKeyword.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException("Keyword already exists");
    }

    // Create new keyword
    const newKeyword = this.keywordsRepository.create({
      keyword: trimmedKeyword.toLowerCase(),
      priority: priority || 1,
      isActive: true,
    });

    await this.keywordsRepository.save(newKeyword);

    return this.transformToResponseDto(newKeyword);
  }

  async findAll(
    query: GetKeywordsQueryDto,
  ): Promise<PaginatedKeywordsResponseDto> {
    const { page = 1, limit = 50, isActive, search } = query;

    const queryBuilder = this.keywordsRepository.createQueryBuilder("keyword");

    // Filter by active status if provided
    if (isActive !== undefined) {
      queryBuilder.andWhere("keyword.isActive = :isActive", { isActive });
    }

    // Search functionality
    if (search) {
      queryBuilder.andWhere(
        "keyword.keyword ILIKE :search",
        { search: `%${search}%` }
      );
    }

    // Sort by priority (highest first) and then by keyword
    queryBuilder
      .orderBy("keyword.priority", "DESC")
      .addOrderBy("keyword.keyword", "ASC");

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Execute query
    const [keywords, total] = await queryBuilder.getManyAndCount();

    // Transform to response DTO
    const data = keywords.map((keyword) =>
      this.transformToResponseDto(keyword),
    );

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

  async findOne(id: string): Promise<KeywordResponseDto> {
    const keyword = await this.keywordsRepository.findOne({
      where: { id },
    });

    if (!keyword) {
      throw new NotFoundException(`Keyword with ID ${id} not found`);
    }

    return this.transformToResponseDto(keyword);
  }

  async update(
    id: string,
    updateKeywordDto: UpdateKeywordDto,
  ): Promise<KeywordResponseDto> {
    const keyword = await this.keywordsRepository.findOne({
      where: { id },
    });

    if (!keyword) {
      throw new NotFoundException(`Keyword with ID ${id} not found`);
    }

    // Check if new keyword value already exists (if being updated)
    if (updateKeywordDto.keyword) {
      const trimmedKeyword = updateKeywordDto.keyword.trim();

      // Validate: prevent empty or whitespace-only keywords
      if (!trimmedKeyword) {
        throw new ConflictException("Keyword cannot be empty or whitespace only");
      }

      // Validate: prevent extremely long keywords
      if (trimmedKeyword.length > 255) {
        throw new ConflictException("Keyword is too long (max 255 characters)");
      }

      const existing = await this.keywordsRepository.findOne({
        where: { keyword: trimmedKeyword.toLowerCase() },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException("Keyword already exists");
      }

      keyword.keyword = trimmedKeyword.toLowerCase();
    }

    if (updateKeywordDto.isActive !== undefined) {
      keyword.isActive = updateKeywordDto.isActive;
    }

    if (updateKeywordDto.priority !== undefined) {
      keyword.priority = updateKeywordDto.priority;
    }

    await this.keywordsRepository.save(keyword);

    return this.transformToResponseDto(keyword);
  }

  async remove(id: string): Promise<void> {
    const keyword = await this.keywordsRepository.findOne({
      where: { id },
    });

    if (!keyword) {
      throw new NotFoundException(`Keyword with ID ${id} not found`);
    }

    await this.keywordsRepository.remove(keyword);
  }

  async toggleActive(id: string): Promise<KeywordResponseDto> {
    const keyword = await this.keywordsRepository.findOne({
      where: { id },
    });

    if (!keyword) {
      throw new NotFoundException(`Keyword with ID ${id} not found`);
    }

    keyword.isActive = !keyword.isActive;
    await this.keywordsRepository.save(keyword);

    return this.transformToResponseDto(keyword);
  }

  async getActiveKeywords(): Promise<KeywordResponseDto[]> {
    const keywords = await this.keywordsRepository.find({
      where: { isActive: true },
      order: { priority: "DESC", keyword: "ASC" },
    });

    return keywords.map((keyword) => this.transformToResponseDto(keyword));
  }

  private transformToResponseDto(keyword: Keyword): KeywordResponseDto {
    return {
      id: keyword.id,
      keyword: keyword.keyword,
      isActive: keyword.isActive,
      priority: keyword.priority,
      createdAt: keyword.createdAt,
      updatedAt: keyword.updatedAt,
    };
  }
}
