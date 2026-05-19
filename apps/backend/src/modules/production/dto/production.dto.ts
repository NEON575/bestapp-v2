import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateProductionJobDto {
  @ApiProperty()
  @IsString()
  orderId!: string;

  @ApiProperty()
  @IsString()
  number!: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty()
  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @ApiProperty()
  @IsOptional()
  @IsDateString()
  finishedAt?: string;
}

export class UpdateProductionJobDto extends PartialType(CreateProductionJobDto) {}

