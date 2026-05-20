import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/query/pagination.dto';

function toBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true';
  return false;
}

export class SalesEntryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managerId?: string;

  @ApiPropertyOptional({ example: 'hesab' })
  @IsOptional()
  @IsString()
  paymentType?: string;

  @ApiPropertyOptional({ example: 'sifaris' })
  @IsOptional()
  @IsString()
  deliveryStatus?: string;

  @ApiPropertyOptional({ example: 'cap' })
  @IsOptional()
  @IsString()
  productionStage?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsOptional()
  @IsBoolean()
  hasDebt?: boolean;
}

export class CreateSalesEntryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiProperty()
  @IsString()
  customerId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paperId?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty()
  @IsString()
  productName!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  quantity!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  saleAmount!: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  paymentAmount?: number;

  @ApiPropertyOptional({ example: 'negd' })
  @IsOptional()
  @IsString()
  paymentType?: string;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  bonus?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  customerBonus?: number;

  @ApiPropertyOptional({ example: 'cap' })
  @IsOptional()
  @IsString()
  productionStage?: string;

  @ApiPropertyOptional({ example: 'sifaris' })
  @IsOptional()
  @IsString()
  deliveryStatus?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @ApiPropertyOptional({ example: 'odenilib' })
  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @ApiPropertyOptional({ example: 'yazilib' })
  @IsOptional()
  @IsString()
  qaimaStatus?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  qaimaDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  qaimaNumber?: string;

  @ApiPropertyOptional({ example: 'four_zero' })
  @IsOptional()
  @IsString()
  printColor?: string;

  @ApiPropertyOptional({ example: 'svoy' })
  @IsOptional()
  @IsString()
  printType?: string;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  paperCost?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  plateCost?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  printCost?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  specialCutCost?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  knifeCost?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  manualWorkCost?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  spiralCost?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  poniCost?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  otherCost?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  laminationCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  spiralType?: string;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  spiralQuantity?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  spiralUnitCost?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  spiralTotalCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invoiceStatusText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSalesEntryDto extends PartialType(CreateSalesEntryDto) {}

