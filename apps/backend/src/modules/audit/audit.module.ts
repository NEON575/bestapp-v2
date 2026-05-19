import { Module } from '@nestjs/common';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditInterceptor],
  exports: [AuditService]
})
export class AuditModule {}

