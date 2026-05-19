import { Injectable } from '@nestjs/common';
import { Prisma, ProductionJobStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProductionJobDto, UpdateProductionJobDto } from './dto/production.dto';

@Injectable()
export class ProductionService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.productionJob.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        order: true,
        route: true,
        operations: true
      }
    });
  }

  findOne(id: string) {
    return this.prisma.productionJob.findFirst({
      where: { id, deletedAt: null },
      include: {
        order: true,
        route: true,
        operations: true
      }
    });
  }

  create(dto: CreateProductionJobDto) {
    return this.prisma.productionJob.create({
      data: {
        orderId: dto.orderId,
        routeId: dto.routeId,
        number: dto.number,
        status: (dto.status as ProductionJobStatus) ?? ProductionJobStatus.queued,
        plannedStartAt: dto.plannedStartAt ? new Date(dto.plannedStartAt) : null,
        deadlineAt: dto.deadlineAt ? new Date(dto.deadlineAt) : null,
        notes: dto.notes
      }
    });
  }

  update(id: string, dto: UpdateProductionJobDto) {
    return this.prisma.productionJob.update({
      where: { id },
      data: {
        orderId: dto.orderId,
        routeId: dto.routeId,
        number: dto.number,
        status: dto.status as ProductionJobStatus | undefined,
        plannedStartAt: dto.plannedStartAt ? new Date(dto.plannedStartAt) : undefined,
        deadlineAt: dto.deadlineAt ? new Date(dto.deadlineAt) : undefined,
        notes: dto.notes
      }
    });
  }

  remove(id: string) {
    return this.prisma.productionJob.update({
      where: { id },
      data: {
        status: ProductionJobStatus.cancelled,
        deletedAt: new Date()
      }
    });
  }
}
