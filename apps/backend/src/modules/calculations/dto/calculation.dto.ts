import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { PaginationQueryDto } from '../../../common/query/pagination.dto';
import {
  CALCULATION_PARAMETER_CATEGORIES,
  type CalculationParameterCategory
} from '../../../common/business/calculation-flow';

const calculationStatusValues = ['draft', 'approved', 'converted'] as const;

export class CalculationListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: calculationStatusValues })
  @IsOptional()
  @IsIn(calculationStatusValues)
  status?: (typeof calculationStatusValues)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;
}

export class CalculationRowDto {
  @ApiProperty({ enum: CALCULATION_PARAMETER_CATEGORIES })
  @IsIn(CALCULATION_PARAMETER_CATEGORIES)
  category!: CalculationParameterCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parameterId?: string;

  @ApiProperty()
  @IsString()
  parameterName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parameterVariant?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  variants?: string[];

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  details?: Record<string, unknown>;

  @ApiProperty()
  @IsString()
  unit!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  quantity!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  unitPrice!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPriceOverridden?: boolean;
}

export class CreateCalculationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  date?: string;

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

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  salePrice?: number;

  @ApiPropertyOptional({ enum: calculationStatusValues })
  @IsOptional()
  @IsIn(calculationStatusValues)
  status?: (typeof calculationStatusValues)[number];

  @ApiProperty({ type: [CalculationRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CalculationRowDto)
  rows!: CalculationRowDto[];
}

export class UpdateCalculationDto extends PartialType(CreateCalculationDto) {}
