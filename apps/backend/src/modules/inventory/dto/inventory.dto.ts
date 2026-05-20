import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
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
