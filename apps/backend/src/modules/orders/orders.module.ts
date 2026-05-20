import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PricingModule } from '../pricing/pricing.module';
import { SalesModule } from '../sales/sales.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [PricingModule, AuditModule, SalesModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService]
})
export class OrdersModule {}
