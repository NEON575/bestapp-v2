import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/query/pagination.dto';

export class PaperQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierId?: string;
}

export class CreatePaperDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  gram!: number;

  @ApiProperty()
  @IsString()
  size!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  packPrice!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  sheetsInPack!: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  vatIncluded?: boolean;

  @ApiPropertyOptional({ default: 'sheet' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePaperDto extends PartialType(CreatePaperDto) {}

