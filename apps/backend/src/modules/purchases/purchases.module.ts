import { Module } from '@nestjs/common';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { WarehouseModule } from '../warehouse/warehouse.module';

@Module({
  imports: [WarehouseModule],
  controllers: [PurchasesController],
  providers: [PurchasesService]
})
export class PurchasesModule {}
