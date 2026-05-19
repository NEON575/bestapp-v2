import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../../common/query/pagination.dto';
import { CreateProductionJobDto, UpdateProductionJobDto } from './dto/production.dto';
import { ProductionService } from './production.service';

@ApiTags('production')
@Controller('production')
export class ProductionController {
  constructor(@Inject(ProductionService) private readonly productionService: ProductionService) {}

  @Get('jobs')
  @Roles('super_admin', 'owner', 'production', 'manager')
  findAll(@Query() query: PaginationQueryDto) {
    return this.productionService.findAll(query);
  }

  @Get('jobs/:id')
  @Roles('super_admin', 'owner', 'production', 'manager')
  findOne(@Param('id') id: string) {
    return this.productionService.findOne(id);
  }

  @Post('jobs')
  @Roles('super_admin', 'owner', 'production', 'manager')
  create(@Body() dto: CreateProductionJobDto) {
    return this.productionService.create(dto);
  }

  @Patch('jobs/:id')
  @Roles('super_admin', 'owner', 'production', 'manager')
  update(@Param('id') id: string, @Body() dto: UpdateProductionJobDto) {
    return this.productionService.update(id, dto);
  }

  @Delete('jobs/:id')
  @Roles('super_admin', 'owner')
  remove(@Param('id') id: string) {
    return this.productionService.remove(id);
  }

  @Get('board')
  @Roles('super_admin', 'owner', 'production', 'manager')
  board() {
    return this.productionService.board();
  }
}
