import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(input: {
    userId?: string | null;
    action: string;
    entityType?: string | null;
    entityId?: string | null;
    beforeData?: unknown;
    afterData?: unknown;
    metadata?: Record<string, unknown> | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    return this.prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        beforeData: input.beforeData as never,
        afterData: input.afterData as never,
        metadata: input.metadata as never,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null
      }
    });
  }

  logTx(
    tx: Prisma.TransactionClient,
    input: {
      userId?: string | null;
      action: string;
      entityType?: string | null;
      entityId?: string | null;
      beforeData?: unknown;
      afterData?: unknown;
      metadata?: Record<string, unknown> | null;
      ipAddress?: string | null;
      userAgent?: string | null;
    }
  ) {
    return tx.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        beforeData: input.beforeData as never,
        afterData: input.afterData as never,
        metadata: input.metadata as never,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null
      }
    });
  }

  findAll() {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100
    });
  }

  findByEntity(entityType: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        entityType,
        entityId
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: true
      }
    });
  }
}
