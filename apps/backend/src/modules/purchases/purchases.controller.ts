import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { PurchasesService } from './purchases.service';
import {
  CreatePurchaseEntryDto,
  CreateSupplierDto,
  PurchaseEntryQueryDto,
  UpdatePurchaseEntryDto,
  UpdateSupplierDto
} from './dto/purchases.dto';

@ApiTags('purchases')
@Controller('purchases')
export class PurchasesController {
  constructor(@Inject(PurchasesService) private readonly purchasesService: PurchasesService) {}

  @Get()
  @Roles('super_admin', 'owner', 'accountant', 'manager')
  findAll(@Query() query: PurchaseEntryQueryDto) {
    return this.purchasesService.findAll(query);
  }

  @Get('summary')
  @Roles('super_admin', 'owner', 'accountant', 'manager')
  summary(@Query() query: PurchaseEntryQueryDto) {
    return this.purchasesService.summary(query);
  }

  @Get('supplier-debts')
  @Roles('super_admin', 'owner', 'accountant', 'manager')
  supplierDebts(@Query('supplierId') supplierId?: string) {
    return this.purchasesService.supplierDebts(supplierId);
  }

  @Get('suppliers')
  @Roles('super_admin', 'owner', 'accountant', 'manager')
  listSuppliers() {
    return this.purchasesService.listSuppliers();
  }

  @Post('suppliers')
  @Roles('super_admin', 'owner', 'accountant', 'manager')
  createSupplier(@Body() dto: CreateSupplierDto) {
    return this.purchasesService.createSupplier(dto);
  }

  @Patch('suppliers/:id')
  @Roles('super_admin', 'owner', 'accountant', 'manager')
  updateSupplier(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.purchasesService.updateSupplier(id, dto);
  }

  @Delete('suppliers/:id')
  @Roles('super_admin', 'owner')
  removeSupplier(@Param('id') id: string) {
    return this.purchasesService.removeSupplier(id);
  }

  @Post()
  @Roles('super_admin', 'owner', 'accountant', 'manager')
  create(@Body() dto: CreatePurchaseEntryDto) {
    return this.purchasesService.create(dto);
  }

  @Post('quick-create')
  @Roles('super_admin', 'owner', 'accountant', 'manager')
  quickCreate(@Body() dto: CreatePurchaseEntryDto) {
    return this.purchasesService.quickCreate(dto);
  }

  @Patch(':id')
  @Roles('super_admin', 'owner', 'accountant', 'manager')
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseEntryDto) {
    return this.purchasesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('super_admin', 'owner')
  remove(@Param('id') id: string) {
    return this.purchasesService.remove(id);
  }
}
