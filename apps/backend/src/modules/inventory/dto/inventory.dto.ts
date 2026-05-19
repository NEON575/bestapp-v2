import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested
} from 'class-validator';

export enum StockMovementTypeDto {
  purchase_in = 'purchase_in',
  reserve = 'reserve',
  write_off = 'write_off',
  return = 'return',
  adjustment = 'adjustment',
  waste = 'waste'
}

export class CreateMaterialDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty()
  @IsString()
  unit!: string;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  stockQuantity?: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  reservedQuantity?: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  costPrice?: number;
}

export class UpdateMaterialDto extends PartialType(CreateMaterialDto) {}

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
}
