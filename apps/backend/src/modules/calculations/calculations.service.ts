import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CalculationStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { OrderStatusDto } from '../orders/dto/order.dto';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buildPaginatedResponse, normalizePagination } from '../../common/query/pagination';
import {
  buildCalculationSnapshot,
  calculateCalculationSummary,
  createEmptyCalculationRow,
  defaultCalculationHeader,
  normalizeCalculationRow,
  normalizeStoredCalculation,
  type CalculationParameterVariantItem,
  type CalculationHeader,
  type CalculationRow,
  type CalculationSnapshot,
  type CalculationStoredPayload,
  type CalculationStatusValue
} from '../../common/business/calculation-flow';
import { CalculationListQueryDto, CreateCalculationDto, UpdateCalculationDto } from './dto/calculation.dto';

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value == null) return 0;
  return typeof value === 'number' ? value : Number(value.toString());
}

function normalizeVariantItems(input?: unknown): CalculationParameterVariantItem[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => {
      if (typeof item === 'string') {
        const value = item.trim();
        return value ? { label: value, value } : null;
      }

      if (item && typeof item === 'object') {
        const candidate = item as Partial<CalculationParameterVariantItem>;
        const label = typeof candidate.label === 'string' ? candidate.label.trim() : '';
        const value = typeof candidate.value === 'string' ? candidate.value.trim() : label;
        return label || value ? { label: label || value, value: value || label } : null;
      }

      return null;
    })
    .filter(Boolean) as CalculationParameterVariantItem[];
}

function mapCalculationStatus(status: CalculationStatusValue | undefined) {
  if (status === 'approved') {
    return CalculationStatus.approved;
  }

  if (status === 'converted') {
    return CalculationStatus.converted;
  }

  return CalculationStatus.draft;
}

function mapStatusFromDb(status: CalculationStatus): CalculationStatusValue {
  if (status === CalculationStatus.approved) {
    return 'approved';
  }

  if (status === CalculationStatus.converted) {
    return 'converted';
  }

  return 'draft';
}

function categoryFromLegacyKey(key?: string): CalculationRow['category'] {
  switch (key) {
    case 'paper':
      return 'paper';
    case 'printing':
      return 'printing';
    case 'form':
      return 'form';
    case 'extra_work':
      return 'manual_work';
    case 'other_costs':
    default:
      return 'other_cost';
  }
}

function legacySectionsToStored(raw: unknown, fallback?: Partial<CalculationHeader>): CalculationStoredPayload {
  const header = {
    ...defaultCalculationHeader(),
    ...fallback
  };

  if (!Array.isArray(raw)) {
    return normalizeStoredCalculation({
      ...header,
      rows: []
    });
  }

  const rows = raw.flatMap((section: any) => {
    const category = categoryFromLegacyKey(section?.key ?? section?.category);
    const sectionRows = Array.isArray(section?.rows) ? section.rows : [];

    return sectionRows.map((row: any) =>
      normalizeCalculationRow({
        category,
        id: row?.id,
        parameterId: row?.parameterId ?? null,
        parameterName: row?.parameterName ?? row?.name ?? section?.title ?? category,
        parameterVariant: row?.parameterVariant ?? null,
        variants: [],
        details: row?.details && typeof row.details === 'object' ? (row.details as Record<string, unknown>) : {},
        unit:
          row?.unit ??
          (category === 'paper'
            ? 'ədəd'
            : category === 'printing'
              ? 'çap'
              : category === 'form'
                ? 'forma'
                : 'ədəd'),
        quantity: row?.quantity ?? row?.printCount ?? row?.formCount ?? 1,
        unitPrice: row?.unitPrice ?? row?.price ?? row?.printPrice ?? row?.formPrice ?? 0,
        isPriceOverridden: Boolean(row?.isPriceOverridden ?? row?.price != null),
        note: row?.note ?? ''
      })
    );
  });

  return normalizeStoredCalculation({
    ...header,
    rows
  });
}

function parseStoredPayload(raw: Prisma.JsonValue | null | undefined, fallback?: Partial<CalculationHeader>) {
  if (!raw) {
    return normalizeStoredCalculation({
      ...(fallback ?? defaultCalculationHeader()),
      rows: []
    });
  }

  if (Array.isArray(raw)) {
    return legacySectionsToStored(raw, fallback);
  }

  if (typeof raw === 'object') {
    const candidate = raw as Partial<CalculationStoredPayload> & { rows?: unknown };
    if (Array.isArray(candidate.rows)) {
      return normalizeStoredCalculation({
        ...defaultCalculationHeader(),
        ...fallback,
        ...candidate
      });
    }
  }

  return normalizeStoredCalculation({
    ...(fallback ?? defaultCalculationHeader()),
    rows: []
  });
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

  private serializeCalculation(calculation: any): CalculationSnapshot | null {
    if (!calculation) {
      return null;
    }

    const payload = parseStoredPayload(calculation.sections, {
      customerId: calculation.customerId,
      productName: calculation.productName,
      quantity: toNumber(calculation.quantity),
      note: calculation.note ?? '',
      salePrice: toNumber(calculation.salePrice),
      status: mapStatusFromDb(calculation.status)
    });

    return buildCalculationSnapshot({
      id: calculation.id,
      number: calculation.number,
      header: {
        date: payload.date,
        customerId: calculation.customerId,
        productName: calculation.productName,
        quantity: toNumber(calculation.quantity),
        note: calculation.note ?? payload.note,
        salePrice: payload.salePrice,
        status: mapStatusFromDb(calculation.status)
      },
      rows: payload.rows,
      customer: calculation.customer
        ? {
            id: calculation.customer.id,
            name: calculation.customer.name,
            companyName: calculation.customer.companyName
          }
        : null,
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
    });
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
    const payload = normalizeStoredCalculation({
      date: dto.date ?? defaultCalculationHeader().date,
      customerId: dto.customerId,
      productName: dto.productName,
      quantity: dto.quantity,
      note: dto.note ?? '',
      salePrice: dto.salePrice ?? 0,
      status: dto.status ?? 'draft',
      rows: dto.rows.map((row) =>
        normalizeCalculationRow({
          category: row.category,
          id: row.id,
          parameterId: row.parameterId ?? null,
          parameterName: row.parameterName,
          parameterVariant: row.parameterVariant ?? null,
          variants: normalizeVariantItems(row.variants),
          details: row.details && typeof row.details === 'object' ? row.details : {},
          unit: row.unit,
          quantity: row.quantity,
          unitPrice: row.unitPrice,
          isPriceOverridden: Boolean(row.isPriceOverridden),
          note: row.note ?? ''
        })
      )
    });

    const number = await this.nextCalculationNumber();

    const created = await this.prisma.calculation.create({
      data: {
        number,
        customerId: payload.customerId,
        productName: payload.productName,
        quantity: payload.quantity,
        note: payload.note || null,
        status: mapCalculationStatus(payload.status),
        salePrice: payload.summary.salePrice,
        costPrice: payload.summary.costPrice,
        profit: payload.summary.profit,
        sections: payload as unknown as Prisma.InputJsonValue
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

    const current = parseStoredPayload(existing.sections, {
      customerId: existing.customerId,
      productName: existing.productName,
      quantity: toNumber(existing.quantity),
      note: existing.note ?? '',
      salePrice: toNumber(existing.salePrice),
      status: mapStatusFromDb(existing.status)
    });

    const payload = normalizeStoredCalculation({
      date: dto.date ?? current.date,
      customerId: dto.customerId ?? current.customerId,
      productName: dto.productName ?? current.productName,
      quantity: dto.quantity ?? current.quantity,
      note: dto.note ?? current.note,
      salePrice: dto.salePrice ?? current.salePrice,
      status: dto.status ?? current.status,
      rows: (dto.rows ?? current.rows).map((row) =>
        normalizeCalculationRow({
          category: row.category,
          id: row.id,
          parameterId: row.parameterId ?? null,
          parameterName: row.parameterName,
          parameterVariant: row.parameterVariant ?? null,
          variants: normalizeVariantItems(row.variants),
          details: row.details && typeof row.details === 'object' ? row.details : {},
          unit: row.unit,
          quantity: row.quantity,
          unitPrice: row.unitPrice,
          isPriceOverridden: Boolean(row.isPriceOverridden),
          note: row.note ?? ''
        })
      )
    });

    const updated = await this.prisma.calculation.update({
      where: { id },
      data: {
        customerId: payload.customerId,
        productName: payload.productName,
        quantity: payload.quantity,
        note: payload.note || null,
        status: mapCalculationStatus(payload.status),
        salePrice: payload.summary.salePrice,
        costPrice: payload.summary.costPrice,
        profit: payload.summary.profit,
        sections: payload as unknown as Prisma.InputJsonValue
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
        order:
          this.serializeOrderSummary(
            calculation.order ?? (await this.prisma.order.findFirst({ where: { id: calculation.orderId } }))
          )!
      };
    }

    const payload = parseStoredPayload(calculation.sections, {
      customerId: calculation.customerId,
      productName: calculation.productName,
      quantity: toNumber(calculation.quantity),
      note: calculation.note ?? '',
      salePrice: toNumber(calculation.salePrice),
      status: mapStatusFromDb(calculation.status)
    });

    const order = await this.ordersService.create({
      customerId: payload.customerId,
      status: OrderStatusDto.draft,
      comment: payload.note || undefined,
      items: [
        {
          name: payload.productName,
          productType: 'calculation',
          quantity: payload.quantity,
          width: 0,
          height: 0,
          unitPrice: payload.summary.saleUnitPrice,
          totalPrice: payload.summary.salePrice,
          unitCost: payload.summary.unitCost,
          totalCost: payload.summary.costPrice
        }
      ]
    });

    const updatedOrder = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        totalAmount: payload.summary.salePrice,
        costAmount: payload.summary.costPrice,
        profitAmount: payload.summary.profit,
        marginPercent: payload.summary.profitPercent,
        customerDebtAmount: payload.summary.salePrice
      }
    });

    const updatedCalculation = await this.prisma.calculation.update({
      where: { id },
      data: {
        status: CalculationStatus.converted,
        orderId: order.id,
        salePrice: payload.summary.salePrice,
        costPrice: payload.summary.costPrice,
        profit: payload.summary.profit,
        sections: payload as unknown as Prisma.InputJsonValue
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
      order: this.serializeOrderSummary(updatedOrder)!
    };
  }
}
