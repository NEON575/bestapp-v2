import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { SalesService } from './sales.service';
import { CreateSalesEntryDto, QuickCreateSalesEntryDto, SalesEntryQueryDto, UpdateSalesEntryDto } from './dto/sales.dto';

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

  @Get('summary')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  summary(@Query() query: SalesEntryQueryDto) {
    return this.salesService.summary(query);
  }

  @Get('customer-debts')
  @Roles('super_admin', 'owner', 'manager', 'accountant')
  customerDebts(@Query() query: SalesEntryQueryDto) {
    return this.salesService.customerDebts(query);
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

  @Post('quick-create')
  @Roles('super_admin', 'owner', 'manager')
  quickCreate(@Body() dto: QuickCreateSalesEntryDto) {
    return this.salesService.quickCreate(dto);
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
