import { Module } from '@nestjs/common';
import { FinanceModule } from '../finance/finance.module';
import { DebtsController } from './debts.controller';

@Module({
  imports: [FinanceModule],
  controllers: [DebtsController]
})
export class DebtsModule {}
