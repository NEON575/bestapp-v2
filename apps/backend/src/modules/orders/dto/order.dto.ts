import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested
} from 'class-validator';

export enum OrderStatusDto {
  draft = 'draft',
  calculated = 'calculated',
  approved = 'approved',
  in_production = 'in_production',
  ready = 'ready',
  delivered = 'delivered',
  cancelled = 'cancelled'
}

export enum OrderItemColorModeDto {
  cmyk = 'cmyk',
  rgb = 'rgb',
  spot = 'spot',
  grayscale = 'grayscale'
}

export class CreateOrderItemDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  productType!: string;

  @ApiProperty()
  @IsNumber()
  width!: number;

  @ApiProperty()
  @IsNumber()
  height!: number;

  @ApiProperty()
  @IsNumber()
  quantity!: number;

  @ApiProperty({ enum: OrderItemColorModeDto })
  @IsEnum(OrderItemColorModeDto)
  colorMode!: OrderItemColorModeDto;

  @ApiProperty()
  @IsOptional()
  @IsString()
  materialId?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  finishingOptions?: string;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  unitCost?: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  totalCost?: number;

  @ApiProperty()
  @IsNumber()
  unitPrice!: number;

  @ApiProperty()
  @IsNumber()
  totalPrice!: number;

  @ApiProperty()
  @IsOptional()
  @IsString()
  comment?: string;
}

export class CreateOrderDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  number?: string;

  @ApiProperty()
  @IsString()
  customerId!: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  managerId?: string;

  @ApiProperty({ enum: OrderStatusDto })
  @IsOptional()
  @IsEnum(OrderStatusDto)
  status?: OrderStatusDto;

  @ApiProperty()
  @IsOptional()
  @IsDateString()
  deadlineAt?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items?: CreateOrderItemDto[];
}

export class UpdateOrderDto extends PartialType(CreateOrderDto) {}
