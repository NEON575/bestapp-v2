import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common';
import { CreateWarehouseDto, WarehouseFilterQueryDto } from './dto/warehouse.dto';
import { WarehouseService } from './warehouse.service';

@Controller('warehouses')
export class WarehousesController {
  constructor(@Inject(WarehouseService) private readonly warehouseService: WarehouseService) {}

  @Get()
  findAll() {
    return this.warehouseService.listWarehouses();
  }

  @Post()
  create(@Body() dto: CreateWarehouseDto) {
    return this.warehouseService.createWarehouse(dto);
  }
}

@Controller('warehouse')
export class WarehouseController {
  constructor(@Inject(WarehouseService) private readonly warehouseService: WarehouseService) {}

  @Get('levels')
  findLevels(@Query() query: WarehouseFilterQueryDto) {
    return this.warehouseService.listLevels(query);
  }

  @Get('movements')
  findMovements(@Query() query: WarehouseFilterQueryDto) {
    return this.warehouseService.listMovements(query);
  }
}
