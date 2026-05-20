import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { SalesService } from './sales.service';
import { CreateSalesEntryDto, SalesEntryQueryDto, UpdateSalesEntryDto } from './dto/sales.dto';

@ApiTags('sales')
@Controller('sales')
export class SalesController {
  constructor(@Inject(SalesService) private readonly salesService: SalesService) {}

  @Get()
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  findAll(@Query() query: SalesEntryQueryDto) {
    return this.salesService.findAll(query);
  }

  @Get('dashboard')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  dashboard() {
    return this.salesService.dashboard();
  }

  @Get('customer-debts')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  customerDebts(@Query('customerId') customerId?: string) {
    return this.salesService.customerDebts(customerId);
  }

  @Get(':id')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }

  @Post()
  @Roles('super_admin', 'owner', 'manager')
  create(@Body() dto: CreateSalesEntryDto) {
    return this.salesService.create(dto);
  }

  @Patch(':id')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  update(@Param('id') id: string, @Body() dto: UpdateSalesEntryDto) {
    return this.salesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('super_admin', 'owner')
  remove(@Param('id') id: string) {
    return this.salesService.remove(id);
  }
}

