import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { CalculationParametersController } from './calculation-parameters.controller';
import { CalculationParametersService } from './calculation-parameters.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [CalculationParametersController],
  providers: [CalculationParametersService],
  exports: [CalculationParametersService]
})
export class CalculationParametersModule {}
