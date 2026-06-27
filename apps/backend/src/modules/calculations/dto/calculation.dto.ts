import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsIn, IsNumber, IsOptional, IsString, Length, Min, ValidateNested } from 'class-validator';
import { PaginationQueryDto } from '../../../common/query/pagination.dto';

export const CALCULATION_STATUS_VALUES = ['draft', 'approved', 'converted', 'cancelled'] as const;
export const CALCULATION_SERVICE_NAMES = ['Çap', 'Kəsim', 'Laminasiya', 'Büküm', 'Dizayn', 'Çatdırılma', 'Digər'] as const;

export type CalculationStatusValue = (typeof CALCULATION_STATUS_VALUES)[number];

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

export class CreateCalculationDto {
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

  @ApiProperty({ type: [CalculationMaterialLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CalculationMaterialLineDto)
  materialLines!: CalculationMaterialLineDto[];

  @ApiProperty({ type: [CalculationServiceLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CalculationServiceLineDto)
  serviceLines!: CalculationServiceLineDto[];
}

export class UpdateCalculationDto extends PartialType(CreateCalculationDto) {}
