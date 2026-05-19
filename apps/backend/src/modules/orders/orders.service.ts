import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateOrderDto, UpdateOrderDto } from './dto/order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {
  }

  findAll() {
    return this.prisma.order.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        items: true,
        invoices: true,
        productionJobs: true
      }
    });
  }

  findOne(id: string) {
    return this.prisma.order.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: true,
        items: true,
        invoices: true,
        productionJobs: true,
        payments: true
      }
    });
  }

  async create(dto: CreateOrderDto) {
    const items = dto.items ?? [];
    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    return this.prisma.order.create({
      data: {
        number: dto.number,
        customerId: dto.customerId,
        status: dto.status ?? 'draft',
        productionStatus: dto.productionStatus ?? 'pending',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        comment: dto.comment,
        totalAmount,
        items: items.length
          ? {
              create: items.map((item) => ({
                name: item.name,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.quantity * item.unitPrice,
                comment: item.comment
              }))
            }
          : undefined
      },
      include: {
        items: true
      }
    });
  }

  update(id: string, dto: UpdateOrderDto) {
    const data: Record<string, unknown> = {
      number: dto.number,
      customerId: dto.customerId,
      status: dto.status,
      productionStatus: dto.productionStatus,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      comment: dto.comment
    };

    return this.prisma.order.update({
      where: { id },
      data
    });
  }

  remove(id: string) {
    return this.prisma.order.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
}
