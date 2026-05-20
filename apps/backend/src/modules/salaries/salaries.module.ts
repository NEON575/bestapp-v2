import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { SalariesController } from './salaries.controller';
import { SalariesService } from './salaries.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [SalariesController],
  providers: [SalariesService]
})
export class SalariesModule {}

