import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/query/pagination.dto';
import { CALCULATION_PARAMETER_CATEGORIES, type CalculationParameterCategory } from '../../../common/business/calculation-flow';

export class CalculationParameterListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CALCULATION_PARAMETER_CATEGORIES })
  @IsOptional()
  @IsIn(CALCULATION_PARAMETER_CATEGORIES)
  category?: CalculationParameterCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  isActive?: string;
}

export class CreateCalculationParameterDto {
  @ApiProperty({ enum: CALCULATION_PARAMETER_CATEGORIES })
  @IsIn(CALCULATION_PARAMETER_CATEGORIES)
  category!: CalculationParameterCategory;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  variants?: string[];

  @ApiProperty()
  @IsString()
  unit!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  price!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateCalculationParameterDto extends PartialType(CreateCalculationParameterDto) {}
