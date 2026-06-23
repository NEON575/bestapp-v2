import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/query/pagination.dto';
import {
  MATERIAL_CATEGORIES,
  MATERIAL_STATUSES,
  MATERIAL_UNITS,
  type MaterialCategoryCode,
  type MaterialStatusFilter,
  type MaterialUnitValue
} from '../materials.constants';

const materialCategoryValues: MaterialCategoryCode[] = MATERIAL_CATEGORIES.map((item) => item.code);
const materialUnitValues: MaterialUnitValue[] = MATERIAL_UNITS.map((item) => item.value);
const materialStatusValues: MaterialStatusFilter[] = [...MATERIAL_STATUSES];

export class MaterialListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: materialCategoryValues })
  @IsOptional()
  @IsIn(materialCategoryValues)
  categoryCode?: MaterialCategoryCode;

  @ApiPropertyOptional({ enum: materialStatusValues, default: 'all' })
  @IsOptional()
  @IsIn(materialStatusValues)
  status?: MaterialStatusFilter = 'all';
}

export class CreateMaterialDto {
  @ApiProperty({ enum: materialCategoryValues })
  @IsIn(materialCategoryValues)
  categoryCode!: MaterialCategoryCode;

  @ApiProperty({ example: 'Ofset 80 qr 64x90' })
  @IsString()
  @Length(1, 255)
  name!: string;

  @ApiPropertyOptional({ example: 'Kağız' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  materialType?: string;

  @ApiPropertyOptional({ example: '80 qr' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  gramThickness?: string;

  @ApiPropertyOptional({ example: '64x90' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  formatSize?: string;

  @ApiProperty({ enum: materialUnitValues })
  @IsIn(materialUnitValues)
  unit!: MaterialUnitValue;

  @ApiPropertyOptional({ example: 'AZN', default: 'AZN' })
  @IsOptional()
  @IsString()
  @Length(3, 12)
  currencyCode?: string;

  @ApiPropertyOptional({ example: 12.5, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  purchasePrice?: number;

  @ApiPropertyOptional({ example: 12.5, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  aznPrice?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpdateMaterialDto extends PartialType(CreateMaterialDto) {}
