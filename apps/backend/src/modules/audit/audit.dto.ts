import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateAuditLogDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  action?: string;
}

