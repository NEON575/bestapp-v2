import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateMaterialDto,
  CreateStockMovementDto,
  UpdateMaterialDto
} from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {
  }

  findAll() {
    return this.prisma.material.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });
  }

  findOne(id: string) {
    return this.prisma.material.findFirst({
      where: { id, deletedAt: null }
    });
  }

  create(dto: CreateMaterialDto) {
    return this.prisma.material.create({ data: dto as any });
  }

  update(id: string, dto: UpdateMaterialDto) {
    return this.prisma.material.update({ where: { id }, data: dto as any });
  }

  createMovement(dto: CreateStockMovementDto) {
    return this.prisma.stockMovement.create({ data: dto as any });
  }

  remove(id: string) {
    return this.prisma.material.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
}
