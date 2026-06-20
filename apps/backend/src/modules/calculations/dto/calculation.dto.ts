import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  Allow,
  IsArray,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/query/pagination.dto';

const calculationStatusValues = ['draft', 'approved', 'converted'] as const;
const templateValues = ['certificate_sheet', 'flyer_booklet', 'catalog_multi_page', 'custom'] as const;
const sheetFormatValues = ['A3', 'A2', 'A1', '70x100', '64x90', 'custom'] as const;
const printColorValues = ['4+0', '4+4', '1+0', '1+1'] as const;
const printSideValues = ['single', 'double'] as const;
const printPricingValues = ['per_unit', 'fixed'] as const;

export class CalculationListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: calculationStatusValues })
  @IsOptional()
  @IsIn(calculationStatusValues)
  status?: (typeof calculationStatusValues)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;
}

export class CalculationExtraCostDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  quantity!: number;

  @ApiProperty()
  @IsString()
  unit!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  unitPrice!: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  total?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class CalculationCatalogDto {
  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  innerPageCount?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  coverPageCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  innerPaperType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  innerPaperGram?: string;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  innerPaperPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverPaperType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverPaperGram?: string;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  coverPaperPrice?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  innerPlacementCount?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  coverPlacementCount?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  innerPrilotka?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  coverPrilotka?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  innerFormCount?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  coverFormCount?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  innerFormPrice?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  coverFormPrice?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  innerPrintPrice?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  coverPrintPrice?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  laminationQuantity?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  laminationUnitPrice?: number;
}

export class CreateCalculationDto {
  @ApiProperty()
  @IsIn(templateValues)
  templateKey!: (typeof templateValues)[number];

  @ApiProperty()
  @IsString()
  customerId!: string;

  @ApiProperty()
  @IsString()
  productName!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  readySize?: string;

  @ApiPropertyOptional({ enum: sheetFormatValues })
  @IsOptional()
  @IsIn(sheetFormatValues)
  sheetFormat?: (typeof sheetFormatValues)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sheetFormatCustom?: string;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  sheetPlacementCount?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  a1ConversionFactor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paperType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paperGram?: string;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  paperPurchasePrice?: number;

  @ApiPropertyOptional({ enum: printColorValues })
  @IsOptional()
  @IsIn(printColorValues)
  color?: (typeof printColorValues)[number];

  @ApiPropertyOptional({ enum: printSideValues })
  @IsOptional()
  @IsIn(printSideValues)
  printSide?: (typeof printSideValues)[number];

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  prilotka?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  formCount?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  formPrice?: number;

  @ApiPropertyOptional({ enum: printPricingValues })
  @IsOptional()
  @IsIn(printPricingValues)
  printPricingMode?: (typeof printPricingValues)[number];

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  printCount?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  printUnitPrice?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  printFixedPrice?: number;

  @ApiPropertyOptional({ type: [CalculationExtraCostDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CalculationExtraCostDto)
  extraCosts?: CalculationExtraCostDto[];

  @ApiPropertyOptional({ type: CalculationCatalogDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CalculationCatalogDto)
  catalog?: CalculationCatalogDto;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  salePrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ enum: calculationStatusValues })
  @IsOptional()
  @IsIn(calculationStatusValues)
  status?: (typeof calculationStatusValues)[number];

  @ApiPropertyOptional()
  @Allow()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpdateCalculationDto extends PartialType(CreateCalculationDto) {}
