import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { CalculationSettingsController } from './calculation-settings.controller';
import { CalculationSettingsService } from './calculation-settings.service';

@Module({
  imports: [PrismaModule],
  controllers: [CalculationSettingsController],
  providers: [CalculationSettingsService],
  exports: [CalculationSettingsService]
})
export class CalculationSettingsModule {}
