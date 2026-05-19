import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMaterialDto {
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
  @IsNumber()
  stockQuantity!: number;

  @ApiProperty()
  @IsNumber()
  reservedQuantity!: number;

  @ApiProperty()
  @IsNumber()
  costPrice!: number;
}

export class UpdateMaterialDto extends PartialType(CreateMaterialDto) {}

export class CreateStockMovementDto {
  @ApiProperty()
  @IsString()
  materialId!: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  productionJobId?: string;

  @ApiProperty()
  @IsString()
  type!: string;

  @ApiProperty()
  @IsNumber()
  quantity!: number;

  @ApiProperty()
  @IsNumber()
  unitCost!: number;

  @ApiProperty()
  @IsNumber()
  totalCost!: number;

  @ApiProperty()
  @IsOptional()
  @IsString()
  note?: string;
}

