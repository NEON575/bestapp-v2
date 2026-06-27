import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { CreatePurchaseDto, PurchaseListQueryDto, UpdatePurchaseDto } from './dto/purchases.dto';
import { PurchasesService } from './purchases.service';

@Controller('purchases')
export class PurchasesController {
  constructor(@Inject(PurchasesService) private readonly purchasesService: PurchasesService) {}

  @Get()
  findAll(@Query() query: PurchaseListQueryDto) {
    return this.purchasesService.list(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.purchasesService.getById(id);
  }

  @Post()
  create(@Body() dto: CreatePurchaseDto) {
    return this.purchasesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseDto) {
    return this.purchasesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.purchasesService.remove(id);
  }

  @Post(':id/confirm')
  confirm(@Param('id') id: string) {
    return this.purchasesService.confirm(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.purchasesService.cancel(id);
  }
}

