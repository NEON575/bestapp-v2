import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export enum ProductionJobStatusDto {
  queued = 'queued',
  in_progress = 'in_progress',
  paused = 'paused',
  completed = 'completed',
  failed = 'failed',
  cancelled = 'cancelled'
}

export enum ProductionOperationStatusDto {
  pending = 'pending',
  ready = 'ready',
  in_progress = 'in_progress',
  paused = 'paused',
  completed = 'completed',
  failed = 'failed',
  cancelled = 'cancelled'
}

export class CreateProductionJobDto {
  @ApiProperty()
  @IsString()
  orderId!: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  routeId?: string;

  @ApiProperty()
  @IsString()
  number!: string;

  @ApiProperty({ enum: ProductionJobStatusDto })
  @IsOptional()
  @IsEnum(ProductionJobStatusDto)
  status?: ProductionJobStatusDto;

  @ApiProperty()
  @IsOptional()
  @IsDateString()
  plannedStartAt?: string;

  @ApiProperty()
  @IsOptional()
  @IsDateString()
  deadlineAt?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateProductionJobDto extends PartialType(CreateProductionJobDto) {}

export class CreateProductionOperationDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  routeId?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  productionJobId?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  workCenterId?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  machineId?: string;

  @ApiProperty()
  @IsNumber()
  sequenceNo!: number;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: ProductionOperationStatusDto })
  @IsOptional()
  @IsEnum(ProductionOperationStatusDto)
  status?: ProductionOperationStatusDto;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  plannedDurationMin?: number;

  @ApiProperty()
  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @ApiProperty()
  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateProductionOperationDto extends PartialType(CreateProductionOperationDto) {}
