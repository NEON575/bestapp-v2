import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CalculationParameterListQueryDto,
  CreateCalculationParameterDto,
  UpdateCalculationParameterDto
} from './dto/calculation-parameter.dto';
import { CalculationParametersService } from './calculation-parameters.service';

@ApiTags('calculation-parameters')
@Controller('calculation-parameters')
export class CalculationParametersController {
  constructor(@Inject(CalculationParametersService) private readonly service: CalculationParametersService) {}

  @Get()
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  findAll(@Query() query: CalculationParameterListQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  create(@Body() dto: CreateCalculationParameterDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  update(@Param('id') id: string, @Body() dto: UpdateCalculationParameterDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
