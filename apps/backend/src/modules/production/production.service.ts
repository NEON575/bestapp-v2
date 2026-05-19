import { Inject, Injectable } from '@nestjs/common';
import { Prisma, ProductionOperationStatus, ProductionJobStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaginationQueryDto } from '../../common/query/pagination.dto';
import { buildPaginatedResponse, normalizePagination } from '../../common/query/pagination';
import { CreateProductionJobDto, UpdateProductionJobDto } from './dto/production.dto';

@Injectable()
export class ProductionService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const { page, limit, skip, take } = normalizePagination(query);
    const where: Prisma.ProductionJobWhereInput = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { number: { contains: query.search, mode: 'insensitive' } },
              { order: { number: { contains: query.search, mode: 'insensitive' } } },
              { order: { customer: { name: { contains: query.search, mode: 'insensitive' } } } }
            ]
          }
        : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
              lte: query.dateTo ? new Date(query.dateTo) : undefined
            }
          }
        : {})
    };

    const orderBy = { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' } as Prisma.ProductionJobOrderByWithRelationInput;

    const [total, data] = await this.prisma.$transaction([
      this.prisma.productionJob.count({ where }),
      this.prisma.productionJob.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          order: { include: { customer: true } },
          route: true,
          operations: true
        }
      })
    ]);

    return buildPaginatedResponse(data, total, page, limit);
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

  async board() {
    const operations = await this.prisma.productionOperation.findMany({
      where: {
        deletedAt: null,
        status: {
          in: [
            ProductionOperationStatus.pending,
            ProductionOperationStatus.ready,
            ProductionOperationStatus.in_progress,
            ProductionOperationStatus.paused,
            ProductionOperationStatus.completed,
            ProductionOperationStatus.failed
          ]
        }
      },
      orderBy: [{ sequenceNo: 'asc' }, { createdAt: 'asc' }],
      include: {
        route: true,
        productionJob: { include: { order: { include: { customer: true } } } },
        template: true,
        workCenter: true,
        machine: true
      }
    });

    const grouped: Record<string, typeof operations> = {
      pending: [],
      ready: [],
      in_progress: [],
      paused: [],
      completed: [],
      failed: []
    };

    for (const operation of operations) {
      const bucket = grouped[operation.status];
      if (bucket) {
        bucket.push(operation);
      }
    }

    return grouped;
  }
}
