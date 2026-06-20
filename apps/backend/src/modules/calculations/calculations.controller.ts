import { Body, Controller, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CalculationListQueryDto, CreateCalculationDto, UpdateCalculationDto } from './dto/calculation.dto';
import { CalculationsService } from './calculations.service';

@ApiTags('calculations')
@Controller('calculations')
export class CalculationsController {
  constructor(@Inject(CalculationsService) private readonly calculationsService: CalculationsService) {}

  @Get()
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  findAll(@Query() query: CalculationListQueryDto) {
    return this.calculationsService.findAll(query);
  }

  @Get(':id')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  findOne(@Param('id') id: string) {
    return this.calculationsService.findOne(id);
  }

  @Post()
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  create(@Body() dto: CreateCalculationDto) {
    return this.calculationsService.create(dto);
  }

  @Patch(':id')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  update(@Param('id') id: string, @Body() dto: UpdateCalculationDto) {
    return this.calculationsService.update(id, dto);
  }

  @Post(':id/convert-to-order')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  convertToOrder(@Param('id') id: string) {
    return this.calculationsService.convertToOrder(id);
  }
}
