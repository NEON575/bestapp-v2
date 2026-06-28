import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/query/pagination.dto';

export const CALCULATION_PRINT_COLOR_MODES = ['4+0', '4+4', '1+0', '1+1'] as const;
export const CALCULATION_LAMINATION_TYPES = ['mat', 'parlaq'] as const;
export const CALCULATION_LAMINATION_SIDE_MODES = ['1+0', '1+1'] as const;
export const CALCULATION_SERVICE_TYPES = ['thermal_glue', 'stapling', 'manual_work', 'cutting', 'creasing', 'folding', 'punching', 'packaging', 'design', 'delivery', 'other_cost'] as const;

export type CalculationPrintColorMode = (typeof CALCULATION_PRINT_COLOR_MODES)[number];
export type CalculationLaminationType = (typeof CALCULATION_LAMINATION_TYPES)[number];
export type CalculationLaminationSideMode = (typeof CALCULATION_LAMINATION_SIDE_MODES)[number];
export type CalculationServiceType = (typeof CALCULATION_SERVICE_TYPES)[number];

export class CalculationSettingsListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  declare search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}

export class CreateCalculationPrintPriceRuleDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minQuantity!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxQuantity!: number;

  @ApiProperty({ enum: CALCULATION_PRINT_COLOR_MODES })
  @IsIn(CALCULATION_PRINT_COLOR_MODES)
  colorMode!: CalculationPrintColorMode;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 500)
  note?: string;
}

export class UpdateCalculationPrintPriceRuleDto extends PartialType(CreateCalculationPrintPriceRuleDto) {}

export class CreateCalculationLaminationPriceRuleDto {
  @ApiProperty({ enum: CALCULATION_LAMINATION_TYPES })
  @IsIn(CALCULATION_LAMINATION_TYPES)
  laminationType!: CalculationLaminationType;

  @ApiProperty({ enum: CALCULATION_LAMINATION_SIDE_MODES })
  @IsIn(CALCULATION_LAMINATION_SIDE_MODES)
  sideMode!: CalculationLaminationSideMode;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 500)
  note?: string;
}

export class UpdateCalculationLaminationPriceRuleDto extends PartialType(CreateCalculationLaminationPriceRuleDto) {}

export class CreateCalculationFormPriceRuleDto {
  @ApiProperty()
  @IsString()
  @Length(1, 255)
  name!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 50)
  unit!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 500)
  note?: string;
}

export class UpdateCalculationFormPriceRuleDto extends PartialType(CreateCalculationFormPriceRuleDto) {}

export class CreateCalculationServicePriceRuleDto {
  @ApiProperty({ enum: CALCULATION_SERVICE_TYPES })
  @IsIn(CALCULATION_SERVICE_TYPES)
  serviceType!: CalculationServiceType;

  @ApiProperty()
  @IsString()
  @Length(1, 255)
  name!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 50)
  unit!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  allowDiscount?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 500)
  note?: string;
}

export class UpdateCalculationServicePriceRuleDto extends PartialType(CreateCalculationServicePriceRuleDto) {}
