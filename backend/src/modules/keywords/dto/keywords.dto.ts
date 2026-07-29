import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateKeywordDto {
  @ApiProperty({ example: 'festival mbois' })
  @IsString()
  @IsNotEmpty()
  keyword: string;

  @ApiPropertyOptional({ example: 1, description: 'Priority (1=highest)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  priority?: number = 1;
}

export class UpdateKeywordDto {
  @ApiPropertyOptional({ example: 'festival mbois 2026' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  keyword?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  priority?: number;
}

export class KeywordResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  keyword: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  priority: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class GetKeywordsQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class PaginatedKeywordsResponseDto {
  @ApiProperty({ type: [KeywordResponseDto] })
  data: KeywordResponseDto[];

  @ApiProperty()
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
