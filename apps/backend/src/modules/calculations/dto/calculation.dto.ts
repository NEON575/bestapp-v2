import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Allow, IsArray, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { CalculationStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/query/pagination.dto';

export class CalculationListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CalculationStatus })
  @IsOptional()
  @IsEnum(CalculationStatus)
  status?: CalculationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;
}

export class CreateCalculationDto {
  @ApiProperty()
  @IsString()
  customerId!: string;

  @ApiProperty()
  @IsString()
  productName!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ enum: CalculationStatus })
  @IsOptional()
  @IsEnum(CalculationStatus)
  status?: CalculationStatus;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  salePrice?: number;

  @ApiProperty({ type: 'array', required: false })
  @Allow()
  @IsOptional()
  @IsArray()
  sections?: unknown[];
}

export class UpdateCalculationDto extends PartialType(CreateCalculationDto) {}
