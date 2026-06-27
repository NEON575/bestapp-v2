import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsDateString, IsIn, IsNumber, IsOptional, IsString, Length, Min, ValidateNested } from 'class-validator';
import { PaginationQueryDto } from '../../../common/query/pagination.dto';

export const PURCHASE_STATUS_VALUES = ['draft', 'confirmed', 'cancelled'] as const;
export const PURCHASE_QUANTITY_MODE_VALUES = ['base', 'package', 'pallet'] as const;
export const PURCHASE_CURRENCY_VALUES = ['AZN', 'USD', 'EUR', 'TRY'] as const;

export type PurchaseStatusValue = (typeof PURCHASE_STATUS_VALUES)[number];
export type PurchaseQuantityModeValue = (typeof PURCHASE_QUANTITY_MODE_VALUES)[number];
export type PurchaseCurrencyValue = (typeof PURCHASE_CURRENCY_VALUES)[number];

export class PurchaseListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: [...PURCHASE_STATUS_VALUES, 'all'], default: 'all' })
  @IsOptional()
  @IsIn([...PURCHASE_STATUS_VALUES, 'all'])
  status?: PurchaseStatusValue | 'all' = 'all';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 36)
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 36)
  paymentType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  onlyDebtors?: boolean;
}

export type PurchaseEntryQueryDto = PurchaseListQueryDto;

export class CreatePurchaseItemDto {
  @ApiProperty()
  @IsString()
  @Length(1, 36)
  materialId!: string;

  @ApiProperty({ enum: PURCHASE_QUANTITY_MODE_VALUES })
  @IsIn(PURCHASE_QUANTITY_MODE_VALUES)
  quantityMode!: PurchaseQuantityModeValue;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional({ example: 0, description: '0 for VAT-free, 18 for VAT-inclusive items' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  vatRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isVatIncluded?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 500)
  notes?: string;
}

export class CreatePurchaseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiProperty()
  @IsString()
  @Length(1, 255)
  supplierName!: string;

  @ApiPropertyOptional({ enum: PURCHASE_CURRENCY_VALUES, default: 'AZN' })
  @IsOptional()
  @IsIn(PURCHASE_CURRENCY_VALUES)
  currencyCode?: PurchaseCurrencyValue;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  exchangeRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  notes?: string;

  @ApiPropertyOptional({ enum: PURCHASE_STATUS_VALUES, default: 'draft' })
  @IsOptional()
  @IsIn(PURCHASE_STATUS_VALUES)
  status?: PurchaseStatusValue;

  @ApiProperty({ type: [CreatePurchaseItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseItemDto)
  items!: CreatePurchaseItemDto[];
}

export class UpdatePurchaseDto extends PartialType(CreatePurchaseDto) {}
