import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { OrdersModule } from '../orders/orders.module';
import { CalculationsController } from './calculations.controller';
import { CalculationsService } from './calculations.service';

@Module({
  imports: [AuditModule, OrdersModule],
  controllers: [CalculationsController],
  providers: [CalculationsService],
  exports: [CalculationsService]
})
export class CalculationsModule {}
