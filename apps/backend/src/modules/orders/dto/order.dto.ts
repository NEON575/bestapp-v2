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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  productType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  formatText?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  printColorText?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiProperty()
  @IsNumber()
  quantity!: number;

  @ApiProperty({ enum: OrderItemColorModeDto, required: false })
  @IsOptional()
  @IsEnum(OrderItemColorModeDto)
  colorMode?: OrderItemColorModeDto;

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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  totalPrice?: number;

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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  date?: string;

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
