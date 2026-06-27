import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CalculationListQueryDto, CreateCalculationDto, UpdateCalculationDto } from './dto/calculation.dto';
import { CalculationsService } from './calculations.service';

@ApiTags('calculations')
@Controller('calculations')
export class CalculationsController {
  constructor(@Inject(CalculationsService) private readonly calculationsService: CalculationsService) {}

  @Get()
  findAll(@Query() query: CalculationListQueryDto) {
    return this.calculationsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.calculationsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCalculationDto) {
    return this.calculationsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCalculationDto) {
    return this.calculationsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.calculationsService.remove(id);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string) {
    return this.calculationsService.approve(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.calculationsService.cancel(id);
  }
}
