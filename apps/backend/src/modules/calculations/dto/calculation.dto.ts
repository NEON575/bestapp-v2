import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/query/pagination.dto';

export const CALCULATION_STATUS_VALUES = ['draft', 'approved', 'converted', 'cancelled'] as const;
export const CALCULATION_BLOCK_TYPES = ['paper', 'printing', 'form', 'lamination', 'service'] as const;
export const CALCULATION_SERVICE_NAMES = ['Çap', 'Kəsim', 'Laminasiya', 'Büküm', 'Dizayn', 'Çatdırılma', 'Digər'] as const;

export type CalculationStatusValue = (typeof CALCULATION_STATUS_VALUES)[number];
export type CalculationBlockTypeValue = (typeof CALCULATION_BLOCK_TYPES)[number];

export class CalculationListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CALCULATION_STATUS_VALUES })
  @IsOptional()
  @IsIn(CALCULATION_STATUS_VALUES)
  status?: CalculationStatusValue;
}

export class CalculationMaterialLineDto {
  @ApiProperty()
  @IsString()
  @Length(1, 36)
  materialId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @ApiProperty()
  @IsString()
  @Length(1, 50)
  unit!: string;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  unitCost?: number;
}

export class CalculationServiceLineDto {
  @ApiProperty()
  @IsString()
  @Length(1, 255)
  serviceName!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @ApiProperty()
  @IsString()
  @Length(1, 50)
  unit!: string;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  unitPrice?: number;
}

export class CalculationBlockDto {
  @ApiProperty()
  @IsString()
  @Length(1, 64)
  id!: string;

  @ApiProperty({ enum: CALCULATION_BLOCK_TYPES })
  @IsString()
  @IsIn(CALCULATION_BLOCK_TYPES)
  type!: CalculationBlockTypeValue;

  @ApiProperty()
  @IsString()
  @Length(1, 255)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 64)
  linkedBlockId?: string | null;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  values?: Record<string, unknown>;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  computed?: Record<string, unknown>;
}

export class CalculationSummaryDto {
  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  paperAmount?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  printAmount?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  formAmount?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  laminationAmount?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  otherCostAmount?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalCost?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  profitPercent?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  profitAmount?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  recommendedSalePrice?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  finalPrice?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  realProfit?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  realProfitPercent?: number;
}

export class CalculationSectionsDto {
  @ApiPropertyOptional({ type: [CalculationBlockDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CalculationBlockDto)
  blocks?: CalculationBlockDto[];

  @ApiPropertyOptional({ type: CalculationSummaryDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CalculationSummaryDto)
  summary?: CalculationSummaryDto;
}

export class CreateCalculationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 36)
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 255)
  customerName?: string;

  @ApiProperty()
  @IsString()
  @Length(1, 255)
  productName!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  note?: string;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  profitPercent?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  finalPrice?: number;

  @ApiPropertyOptional({ enum: CALCULATION_STATUS_VALUES, default: 'draft' })
  @IsOptional()
  @IsIn(CALCULATION_STATUS_VALUES)
  status?: CalculationStatusValue;

  @ApiPropertyOptional({ type: [CalculationMaterialLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CalculationMaterialLineDto)
  materialLines?: CalculationMaterialLineDto[];

  @ApiPropertyOptional({ type: [CalculationServiceLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CalculationServiceLineDto)
  serviceLines?: CalculationServiceLineDto[];

  @ApiPropertyOptional({ type: CalculationSectionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CalculationSectionsDto)
  sections?: CalculationSectionsDto;
}

export class UpdateCalculationDto extends PartialType(CreateCalculationDto) {}
