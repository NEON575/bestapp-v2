import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsEnum, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/query/pagination.dto';

export enum StockMovementTypeDto {
  purchase_in = 'purchase_in',
  reserve = 'reserve',
  write_off = 'write_off',
  return = 'return',
  adjustment = 'adjustment',
  waste = 'waste'
}

export class MaterialQueryDto extends PaginationQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiProperty({ required: false, example: 300 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  gram?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  lowStockOnly?: boolean;

  @ApiPropertyOptional({ enum: ['positive', 'zero'] })
  @IsOptional()
  @IsString()
  stockState?: 'positive' | 'zero';
}

export class CreateMaterialDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty()
  @IsString()
  unit!: string;

  @ApiPropertyOptional({ example: 'list' })
  @IsOptional()
  @IsString()
  stockUnit?: string;

  @ApiPropertyOptional({ example: 'bağlama' })
  @IsOptional()
  @IsString()
  packageUnit?: string;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  defaultUnitsPerPackage?: number;

  @ApiProperty({ required: false, example: 300 })
  @IsOptional()
  @IsNumber()
  gram?: number;

  @ApiProperty({ required: false, example: 'A3' })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiProperty({ required: false, example: 45 })
  @IsOptional()
  @IsNumber()
  packPrice?: number;

  @ApiProperty({ required: false, example: 250 })
  @IsOptional()
  @IsNumber()
  quantityInPack?: number;

  @ApiProperty({ required: false, example: 0.18 })
  @IsOptional()
  @IsNumber()
  unitCost?: number;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  vatIncluded?: boolean;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false, example: 10 })
  @IsOptional()
  @IsNumber()
  minStockLevel?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  stockQuantity?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  reservedQuantity?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  costPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateMaterialDto extends PartialType(CreateMaterialDto) {}

export class CreateMaterialCategoryDto {
  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  codePrefix?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: 'array', example: [{ key: 'gram', label: 'Qram', type: 'number' }] })
  @IsOptional()
  @IsArray()
  dynamicFields?: Array<Record<string, unknown>>;
}

export class UpdateMaterialCategoryDto extends PartialType(CreateMaterialCategoryDto) {}

export class CreateStockMovementDto {
  @ApiProperty()
  @IsString()
  materialId!: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  orderItemId?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  productionJobId?: string;

  @ApiProperty({ enum: StockMovementTypeDto })
  @IsEnum(StockMovementTypeDto)
  type!: StockMovementTypeDto;

  @ApiProperty()
  @IsNumber()
  quantity!: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  unitCost?: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  totalCost?: number;

  @ApiProperty()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  date?: string;
}

export class ReserveStockDto {
  @ApiProperty()
  @IsString()
  orderId!: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  orderItemId?: string;

  @ApiProperty()
  @IsString()
  materialId!: string;

  @ApiProperty()
  @IsString()
  warehouseId!: string;

  @ApiProperty()
  @IsNumber()
  quantity!: number;

  @ApiProperty()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  date?: string;
}

export class WriteOffStockDto {
  @ApiProperty()
  @IsString()
  materialId!: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  reservationId?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  productionJobId?: string;

  @ApiProperty()
  @IsNumber()
  quantity!: number;

  @ApiProperty()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  date?: string;
}
