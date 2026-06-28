import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString, Length, Matches } from 'class-validator';
import { PaginationQueryDto } from '../../../common/query/pagination.dto';

function emptyToUndefined({ value }: { value: unknown }) {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }

  return value;
}

export class SupplierListQueryDto extends PaginationQueryDto {
  @ApiProperty({ enum: ['all', 'active', 'inactive'], default: 'all', required: false })
  @IsOptional()
  @IsString()
  status?: 'all' | 'active' | 'inactive' = 'all';
}

export class CreateSupplierDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @Length(0, 32)
  @Matches(/^SUP-\d{6}$/, { message: 'Təchizatçı kodu SUP-000001 formatında olmalıdır' })
  code?: string;

  @ApiProperty()
  @IsString()
  @Length(1, 255)
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @Length(0, 50)
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @Length(0, 50)
  taxId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @Length(0, 500)
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @Length(0, 1000)
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}
