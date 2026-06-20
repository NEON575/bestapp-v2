import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CalculationStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { OrderStatusDto } from '../orders/dto/order.dto';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buildPaginatedResponse, normalizePagination } from '../../common/query/pagination';
import { normalizeCalculationInput } from '../../common/business/calculation';
import { CreateCalculationDto, CalculationListQueryDto, UpdateCalculationDto } from './dto/calculation.dto';

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value == null) return 0;
  return typeof value === 'number' ? value : Number(value.toString());
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

@Injectable()
export class CalculationsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OrdersService) private readonly ordersService: OrdersService,
    @Inject(AuditService) private readonly auditService: AuditService
  ) {}

  private async nextCalculationNumber() {
    const sequence = await this.prisma.numberSequence.upsert({
      where: { key: 'calculation' },
      update: { currentValue: { increment: 1 } },
      create: {
        key: 'calculation',
        prefix: 'CAL-',
        currentValue: 1,
        step: 1,
        padding: 6
      }
    });

    const value = sequence.currentValue.toString().padStart(sequence.padding, '0');
    return `${sequence.prefix}${value}`;
  }

  private db(tx?: Prisma.TransactionClient) {
    return tx ?? this.prisma;
  }

  private serializeOrderSummary(order: any) {
    if (!order) {
      return null;
    }

    return {
      id: order.id,
      number: order.number,
      status: order.status,
      totalAmount: toNumber(order.totalAmount)
    };
  }

  private serializeCalculation(calculation: any) {
    if (!calculation) {
      return null;
    }

    const sections = Array.isArray(calculation.sections) ? calculation.sections : [];
    const salePrice = toNumber(calculation.salePrice);
    const quantity = toNumber(calculation.quantity);

    return {
      id: calculation.id,
      number: calculation.number,
      status: calculation.status,
      customerId: calculation.customerId,
      customer: calculation.customer
        ? {
            id: calculation.customer.id,
            name: calculation.customer.name,
            companyName: calculation.customer.companyName
          }
        : null,
      productName: calculation.productName,
      quantity,
      note: calculation.note,
      salePrice,
      costPrice: toNumber(calculation.costPrice),
      profit: toNumber(calculation.profit),
      saleUnitPrice: quantity > 0 ? roundMoney(salePrice / quantity) : 0,
      orderId: calculation.orderId,
      order: calculation.order
        ? {
            id: calculation.order.id,
            number: calculation.order.number,
            status: calculation.order.status,
            totalAmount: toNumber(calculation.order.totalAmount)
          }
        : null,
      sections,
      createdAt: calculation.createdAt.toISOString(),
      updatedAt: calculation.updatedAt.toISOString()
    };
  }

  private buildWhere(query: CalculationListQueryDto) {
    const search = query.search?.trim();

    return {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(search
        ? {
            OR: [
              { number: { contains: search, mode: 'insensitive' as const } },
              { productName: { contains: search, mode: 'insensitive' as const } },
              { note: { contains: search, mode: 'insensitive' as const } },
              { customer: { name: { contains: search, mode: 'insensitive' as const } } }
            ]
          }
        : {})
    } satisfies Prisma.CalculationWhereInput;
  }

  async findAll(query: CalculationListQueryDto) {
    const { page, limit, skip, take } = normalizePagination(query);
    const where = this.buildWhere(query);
    const orderByField = query.sortBy ?? 'createdAt';
    const orderBy = { [orderByField]: query.sortOrder ?? 'desc' } as Prisma.CalculationOrderByWithRelationInput;

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.calculation.count({ where }),
      this.prisma.calculation.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          customer: true,
          order: true
        }
      })
    ]);

    return buildPaginatedResponse(
      rows.map((calculation) => this.serializeCalculation(calculation)!),
      total,
      page,
      limit
    );
  }

  async findOne(id: string) {
    const calculation = await this.prisma.calculation.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: true,
        order: true
      }
    });

    if (!calculation) {
      throw new NotFoundException('Calculation not found');
    }

    return this.serializeCalculation(calculation);
  }

  async create(dto: CreateCalculationDto) {
    const normalized = normalizeCalculationInput(dto as any);
    const number = await this.nextCalculationNumber();

    const created = await this.prisma.calculation.create({
      data: {
        number,
        customerId: normalized.customerId,
        productName: normalized.productName,
        quantity: normalized.quantity,
        note: normalized.note,
        status: normalized.status,
        salePrice: normalized.salePrice,
        costPrice: normalized.costPrice,
        profit: normalized.profit,
        sections: normalized.sections as unknown as Prisma.InputJsonValue
      },
      include: {
        customer: true,
        order: true
      }
    });

    await this.auditService.log({
      action: 'calculation.created',
      entityType: 'calculation',
      entityId: created.id,
      afterData: created,
      metadata: {
        number: created.number
      }
    });

    return this.serializeCalculation(created)!;
  }

  async update(id: string, dto: UpdateCalculationDto) {
    const existing = await this.prisma.calculation.findFirst({
      where: { id, deletedAt: null },
      include: { customer: true, order: true }
    });

    if (!existing) {
      throw new NotFoundException('Calculation not found');
    }

    const normalized = normalizeCalculationInput({
      customerId: dto.customerId ?? existing.customerId,
      productName: dto.productName ?? existing.productName,
      quantity: dto.quantity ?? toNumber(existing.quantity),
      note: dto.note ?? existing.note ?? undefined,
      status: dto.status ?? existing.status,
      salePrice: dto.salePrice ?? toNumber(existing.salePrice),
      sections: (dto.sections ?? (existing.sections as unknown[])) as any
    } as any);

    const updated = await this.prisma.calculation.update({
      where: { id },
      data: {
        customerId: normalized.customerId,
        productName: normalized.productName,
        quantity: normalized.quantity,
        note: normalized.note,
        status: normalized.status,
        salePrice: normalized.salePrice,
        costPrice: normalized.costPrice,
        profit: normalized.profit,
        sections: normalized.sections as unknown as Prisma.InputJsonValue
      },
      include: {
        customer: true,
        order: true
      }
    });

    await this.auditService.log({
      action: 'calculation.updated',
      entityType: 'calculation',
      entityId: updated.id,
      beforeData: existing,
      afterData: updated
    });

    return this.serializeCalculation(updated)!;
  }

  async convertToOrder(id: string) {
    const calculation = await this.prisma.calculation.findFirst({
      where: { id, deletedAt: null },
      include: { customer: true, order: true }
    });

    if (!calculation) {
      throw new NotFoundException('Calculation not found');
    }

    if (calculation.orderId) {
      return {
        calculation: this.serializeCalculation(calculation)!,
        order: this.serializeOrderSummary(
          calculation.order ?? (await this.prisma.order.findFirst({ where: { id: calculation.orderId } }))
        )
      };
    }

    const quantity = toNumber(calculation.quantity);
    const salePrice = toNumber(calculation.salePrice);
    const unitPrice = quantity > 0 ? roundMoney(salePrice / quantity) : 0;
    const unitCost = quantity > 0 ? roundMoney(toNumber(calculation.costPrice) / quantity) : 0;

    const order = await this.ordersService.create({
      customerId: calculation.customerId,
      status: OrderStatusDto.draft,
      comment: calculation.note ?? undefined,
      items: [
        {
          name: calculation.productName,
          productType: 'calculation',
          quantity,
          width: 0,
          height: 0,
          unitPrice,
          totalPrice: salePrice,
          unitCost,
          totalCost: toNumber(calculation.costPrice)
        }
      ]
    });

    const costPrice = toNumber(calculation.costPrice);
    const profit = roundMoney(salePrice - costPrice);
    const marginPercent = salePrice > 0 ? roundMoney((profit / salePrice) * 100) : 0;

    const updatedOrder = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        totalAmount: salePrice,
        costAmount: costPrice,
        profitAmount: profit,
        marginPercent,
        customerDebtAmount: salePrice
      }
    });

    const updatedCalculation = await this.prisma.calculation.update({
      where: { id },
      data: {
        status: CalculationStatus.converted,
        orderId: order.id
      },
      include: {
        customer: true,
        order: true
      }
    });

    await this.auditService.log({
      action: 'calculation.converted_to_order',
      entityType: 'calculation',
      entityId: id,
      beforeData: calculation,
      afterData: updatedCalculation,
      metadata: {
        orderId: order.id
      }
    });

    return {
      calculation: this.serializeCalculation(updatedCalculation)!,
      order: this.serializeOrderSummary(updatedOrder)
    };
  }
}
