import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';
import { PaginationQueryDto } from '../../../common/query/pagination.dto';

export class CreateWarehouseDto {
  @ApiProperty()
  @IsString()
  @Length(1, 50)
  code!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 255)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;
}

export class WarehouseQueryDto extends PaginationQueryDto {}

export class WarehouseFilterQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 36)
  warehouseId?: string;
}
