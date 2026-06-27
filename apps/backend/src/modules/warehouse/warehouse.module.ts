import { Module } from '@nestjs/common';
import { WarehouseController, WarehousesController } from './warehouse.controller';
import { WarehouseService } from './warehouse.service';

@Module({
  controllers: [WarehousesController, WarehouseController],
  providers: [WarehouseService],
  exports: [WarehouseService]
})
export class WarehouseModule {}
