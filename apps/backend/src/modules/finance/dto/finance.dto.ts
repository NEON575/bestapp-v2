import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export enum InvoiceStatusDto {
  draft = 'draft',
  issued = 'issued',
  partially_paid = 'partially_paid',
  paid = 'paid',
  overdue = 'overdue',
  cancelled = 'cancelled'
}

export enum PaymentMethodDto {
  cash = 'cash',
  card = 'card',
  bank_transfer = 'bank_transfer',
  other = 'other'
}

export enum PaymentStatusDto {
  pending = 'pending',
  completed = 'completed',
  failed = 'failed',
  reversed = 'reversed'
}

export class CreateInvoiceDto {
  @ApiProperty()
  @IsString()
  orderId!: string;

  @ApiProperty()
  @IsString()
  number!: string;

  @ApiProperty({ enum: InvoiceStatusDto })
  @IsOptional()
  @IsEnum(InvoiceStatusDto)
  status?: InvoiceStatusDto;

  @ApiProperty()
  @IsNumber()
  totalAmount!: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  paidAmount?: number;

  @ApiProperty()
  @IsOptional()
  @IsDateString()
  dueAt?: string;
}

export class UpdateInvoiceDto extends PartialType(CreateInvoiceDto) {}

export class CreatePaymentDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  invoiceId?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  cashboxId?: string;

  @ApiProperty()
  @IsNumber()
  amount!: number;

  @ApiProperty({ enum: PaymentMethodDto })
  @IsEnum(PaymentMethodDto)
  method!: PaymentMethodDto;

  @ApiProperty({ enum: PaymentStatusDto })
  @IsOptional()
  @IsEnum(PaymentStatusDto)
  status?: PaymentStatusDto;

  @ApiProperty()
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  createdById?: string;
}

export class CreateCashboxDto {
  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  currencyCode?: string;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  openingBalance?: number;
}

export class UpdateCashboxDto extends PartialType(CreateCashboxDto) {}
