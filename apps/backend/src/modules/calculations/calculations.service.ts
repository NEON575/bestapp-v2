import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CalculationStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { OrderStatusDto } from '../orders/dto/order.dto';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buildPaginatedResponse, normalizePagination } from '../../common/query/pagination';
import {
  calculateCalculation,
  defaultCalculationValues,
  type CalculationConvertResult,
  type CalculationFormValues,
  type CalculationRecord,
  type CalculationStoredPayload
} from '../../common/business/calculation-engine';
import { CalculationListQueryDto, CreateCalculationDto, UpdateCalculationDto } from './dto/calculation.dto';

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value == null) return 0;
  return typeof value === 'number' ? value : Number(value.toString());
}

function mapCalculationStatus(status: CalculationFormValues['status']) {
  if (status === 'approved') {
    return CalculationStatus.approved;
  }

  if (status === 'converted') {
    return CalculationStatus.converted;
  }

  return CalculationStatus.draft;
}

function parseStoredPayload(raw: Prisma.JsonValue | null | undefined): CalculationStoredPayload {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return calculateCalculation(defaultCalculationValues('custom')).stored;
  }

  const input = raw as Partial<CalculationStoredPayload> & { templateKey?: CalculationFormValues['templateKey'] };
  return calculateCalculation({
    ...defaultCalculationValues((input.templateKey ?? 'custom') as CalculationFormValues['templateKey']),
    ...input
  }).stored;
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

  private serializeCalculation(calculation: any): CalculationRecord | null {
    if (!calculation) {
      return null;
    }

    const payload = parseStoredPayload(calculation.sections);
    const summary = payload.summary ?? calculateCalculation(payload).summary;

    return {
      id: calculation.id,
      number: calculation.number,
      status: calculation.status,
      templateKey: payload.templateKey,
      customerId: calculation.customerId,
      customer: calculation.customer
        ? {
            id: calculation.customer.id,
            name: calculation.customer.name,
            companyName: calculation.customer.companyName
          }
        : null,
      productName: calculation.productName,
      quantity: toNumber(calculation.quantity),
      readySize: payload.readySize,
      sheetFormat: payload.sheetFormat,
      sheetFormatCustom: payload.sheetFormatCustom,
      sheetPlacementCount: payload.sheetPlacementCount,
      a1ConversionFactor: payload.a1ConversionFactor,
      paperType: payload.paperType,
      paperGram: payload.paperGram,
      paperPurchasePrice: payload.paperPurchasePrice,
      color: payload.color,
      printSide: payload.printSide,
      prilotka: payload.prilotka,
      formCount: payload.formCount,
      formPrice: payload.formPrice,
      printPricingMode: payload.printPricingMode,
      printCount: payload.printCount,
      printUnitPrice: payload.printUnitPrice,
      printFixedPrice: payload.printFixedPrice,
      extraCosts: payload.extraCosts,
      catalog: payload.catalog,
      salePrice: summary.salePrice,
      note: calculation.note,
      costPrice: toNumber(calculation.costPrice),
      saleUnitPrice: summary.saleUnitPrice,
      profit: toNumber(calculation.profit),
      profitPercent: summary.profitPercent,
      summary,
      orderId: calculation.orderId,
      order: calculation.order
        ? {
            id: calculation.order.id,
            number: calculation.order.number,
            status: calculation.order.status,
            totalAmount: toNumber(calculation.order.totalAmount)
          }
        : null,
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
    const normalized = calculateCalculation({
      templateKey: dto.templateKey,
      customerId: dto.customerId,
      productName: dto.productName,
      quantity: dto.quantity,
      readySize: dto.readySize,
      sheetFormat: dto.sheetFormat,
      sheetFormatCustom: dto.sheetFormatCustom,
      sheetPlacementCount: dto.sheetPlacementCount,
      a1ConversionFactor: dto.a1ConversionFactor,
      paperType: dto.paperType,
      paperGram: dto.paperGram,
      paperPurchasePrice: dto.paperPurchasePrice,
      color: dto.color,
      printSide: dto.printSide,
      prilotka: dto.prilotka,
      formCount: dto.formCount,
      formPrice: dto.formPrice,
      printPricingMode: dto.printPricingMode,
      printCount: dto.printCount,
      printUnitPrice: dto.printUnitPrice,
      printFixedPrice: dto.printFixedPrice,
      extraCosts: dto.extraCosts as any,
      catalog: dto.catalog as any,
      salePrice: dto.salePrice,
      note: dto.note,
      status: dto.status
    });
    const number = await this.nextCalculationNumber();

    const created = await this.prisma.calculation.create({
      data: {
        number,
        customerId: normalized.stored.customerId,
        productName: normalized.stored.productName,
        quantity: normalized.stored.quantity,
        note: normalized.stored.note || null,
        status: mapCalculationStatus(normalized.stored.status),
        salePrice: normalized.stored.salePrice,
        costPrice: normalized.stored.costPrice,
        profit: normalized.stored.profit,
        sections: normalized.stored as unknown as Prisma.InputJsonValue
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
        number: created.number,
        templateKey: normalized.stored.templateKey
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

    const current = parseStoredPayload(existing.sections);
    const normalized = calculateCalculation({
      ...current,
      ...dto,
      extraCosts: (dto.extraCosts as any) ?? current.extraCosts,
      catalog: {
        ...current.catalog,
        ...(dto.catalog ?? {})
      },
      templateKey: dto.templateKey ?? current.templateKey,
      customerId: dto.customerId ?? current.customerId,
      productName: dto.productName ?? current.productName,
      quantity: dto.quantity ?? current.quantity,
      readySize: dto.readySize ?? current.readySize,
      sheetFormat: dto.sheetFormat ?? current.sheetFormat,
      sheetFormatCustom: dto.sheetFormatCustom ?? current.sheetFormatCustom,
      sheetPlacementCount: dto.sheetPlacementCount ?? current.sheetPlacementCount,
      a1ConversionFactor: dto.a1ConversionFactor ?? current.a1ConversionFactor,
      paperType: dto.paperType ?? current.paperType,
      paperGram: dto.paperGram ?? current.paperGram,
      paperPurchasePrice: dto.paperPurchasePrice ?? current.paperPurchasePrice,
      color: dto.color ?? current.color,
      printSide: dto.printSide ?? current.printSide,
      prilotka: dto.prilotka ?? current.prilotka,
      formCount: dto.formCount ?? current.formCount,
      formPrice: dto.formPrice ?? current.formPrice,
      printPricingMode: dto.printPricingMode ?? current.printPricingMode,
      printCount: dto.printCount ?? current.printCount,
      printUnitPrice: dto.printUnitPrice ?? current.printUnitPrice,
      printFixedPrice: dto.printFixedPrice ?? current.printFixedPrice,
      salePrice: dto.salePrice ?? current.salePrice,
      note: dto.note ?? current.note,
      status: dto.status ?? current.status
    });

    const updated = await this.prisma.calculation.update({
      where: { id },
      data: {
        customerId: normalized.stored.customerId,
        productName: normalized.stored.productName,
        quantity: normalized.stored.quantity,
        note: normalized.stored.note || null,
        status: mapCalculationStatus(normalized.stored.status),
        salePrice: normalized.stored.salePrice,
        costPrice: normalized.stored.costPrice,
        profit: normalized.stored.profit,
        sections: normalized.stored as unknown as Prisma.InputJsonValue
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

  async convertToOrder(id: string): Promise<CalculationConvertResult> {
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
        order:
          this.serializeOrderSummary(
            calculation.order ?? (await this.prisma.order.findFirst({ where: { id: calculation.orderId } }))
          )!
      };
    }

    const payload = parseStoredPayload(calculation.sections);
    const recalculated = calculateCalculation({
      ...payload,
      customerId: calculation.customerId,
      productName: calculation.productName,
      quantity: toNumber(calculation.quantity),
      salePrice: toNumber(calculation.salePrice),
      note: calculation.note ?? payload.note
    });

    const order = await this.ordersService.create({
      customerId: recalculated.stored.customerId,
      status: OrderStatusDto.draft,
      comment: recalculated.stored.note || undefined,
      items: [
        {
          name: recalculated.stored.productName,
          productType: recalculated.stored.templateKey,
          quantity: recalculated.stored.quantity,
          width: 0,
          height: 0,
          unitPrice: recalculated.stored.saleUnitPrice,
          totalPrice: recalculated.stored.summary.salePrice,
          unitCost: recalculated.stored.summary.unitCost,
          totalCost: recalculated.stored.summary.costPrice
        }
      ]
    });

    const costPrice = recalculated.stored.summary.costPrice;
    const profit = recalculated.stored.summary.profit;
    const marginPercent = recalculated.stored.summary.profitPercent;

    const updatedOrder = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        totalAmount: recalculated.stored.summary.salePrice,
        costAmount: costPrice,
        profitAmount: profit,
        marginPercent,
        customerDebtAmount: recalculated.stored.summary.salePrice
      }
    });

    const updatedCalculation = await this.prisma.calculation.update({
      where: { id },
      data: {
        status: CalculationStatus.converted,
        orderId: order.id,
        salePrice: recalculated.stored.summary.salePrice,
        costPrice,
        profit,
        sections: recalculated.stored as unknown as Prisma.InputJsonValue
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
        orderId: order.id,
        templateKey: recalculated.stored.templateKey
      }
    });

    return {
      calculation: this.serializeCalculation(updatedCalculation)!,
      order: this.serializeOrderSummary(updatedOrder)!
    };
  }
}
