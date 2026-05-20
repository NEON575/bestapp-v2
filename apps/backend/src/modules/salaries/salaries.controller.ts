import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { SalariesService } from './salaries.service';
import {
  CreateEmployeeDto,
  CreateSalaryEntryDto,
  SalaryEntryQueryDto,
  UpdateEmployeeDto,
  UpdateSalaryEntryDto
} from './dto/salaries.dto';

@ApiTags('salaries')
@Controller('salaries')
export class SalariesController {
  constructor(@Inject(SalariesService) private readonly salariesService: SalariesService) {}

  @Get()
  @Roles('super_admin', 'owner', 'accountant')
  findAll(@Query() query: SalaryEntryQueryDto) {
    return this.salariesService.findAll(query);
  }

  @Get('summary')
  @Roles('super_admin', 'owner', 'accountant')
  summary() {
    return this.salariesService.summary();
  }

  @Get('employees')
  @Roles('super_admin', 'owner', 'accountant')
  listEmployees() {
    return this.salariesService.listEmployees();
  }

  @Post('employees')
  @Roles('super_admin', 'owner', 'accountant')
  createEmployee(@Body() dto: CreateEmployeeDto) {
    return this.salariesService.createEmployee(dto);
  }

  @Patch('employees/:id')
  @Roles('super_admin', 'owner', 'accountant')
  updateEmployee(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.salariesService.updateEmployee(id, dto);
  }

  @Post()
  @Roles('super_admin', 'owner', 'accountant')
  create(@Body() dto: CreateSalaryEntryDto) {
    return this.salariesService.create(dto);
  }

  @Patch(':id')
  @Roles('super_admin', 'owner', 'accountant')
  update(@Param('id') id: string, @Body() dto: UpdateSalaryEntryDto) {
    return this.salariesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('super_admin', 'owner')
  remove(@Param('id') id: string) {
    return this.salariesService.remove(id);
  }
}

