import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProductionJobDto, UpdateProductionJobDto } from './dto/production.dto';

@Injectable()
export class ProductionService {
  constructor(private readonly prisma: PrismaService) {
  }

  findAll() {
    return this.prisma.productionJob.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { order: true }
    });
  }

  create(dto: CreateProductionJobDto) {
    return this.prisma.productionJob.create({
      data: {
        orderId: dto.orderId,
        number: dto.number,
        status: dto.status ?? 'queued',
        notes: dto.notes,
        startedAt: dto.startedAt ? new Date(dto.startedAt) : null,
        finishedAt: dto.finishedAt ? new Date(dto.finishedAt) : null
      }
    });
  }

  update(id: string, dto: UpdateProductionJobDto) {
    return this.prisma.productionJob.update({
      where: { id },
      data: {
        ...dto,
        startedAt: dto.startedAt ? new Date(dto.startedAt) : undefined,
        finishedAt: dto.finishedAt ? new Date(dto.finishedAt) : undefined
      }
    });
  }

  remove(id: string) {
    return this.prisma.productionJob.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
}
