import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../../modules/audit/audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(method);

    return next.handle().pipe(
      tap((result) => {
        if (!isMutation) {
          return;
        }

        void this.auditService.log({
          userId: request.user?.sub ?? null,
          action: `${method} ${request.route?.path ?? request.url}`,
          entityType: request.baseUrl?.replace('/api/v1/', '') ?? null,
          entityId: request.params?.id ?? null,
          beforeData: null,
          afterData: result ?? null,
          metadata: {
            body: request.body ?? null,
            query: request.query ?? null
          },
          ipAddress: request.ip ?? null,
          userAgent: request.headers['user-agent'] ?? null
        });
      })
    );
  }
}
