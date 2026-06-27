import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CalculationStatus, Prisma, type Calculation as PrismaCalculation, type Material } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buildPaginatedResponse, normalizePagination } from '../../common/query/pagination';
import {
  CalculationListQueryDto,
  CreateCalculationDto,
  UpdateCalculationDto,
  type CalculationStatusValue
} from './dto/calculation.dto';

type CalculationMaterialLineRecord = {
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  availableStock: number;
};

type CalculationServiceLineRecord = {
  serviceName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalCost: number;
};

type CalculationResponse = {
  id: string;
  number: string;
  customerName: string;
  productName: string;
  quantity: number;
  note?: string | null;
  status: CalculationStatusValue;
  materialCost: number;
  serviceCost: number;
  totalCost: number;
  profitPercent: number;
  profitAmount: number;
  salePrice: number;
  finalPrice: number;
  costPrice: number;
  profit: number;
  sections: {
    materialLines: CalculationMaterialLineRecord[];
    serviceLines: CalculationServiceLineRecord[];
  };
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string | null;
};

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value == null) {
    return 0;
  }

  return Number(value.toString());
}

function toDecimal(value: number | string | Prisma.Decimal) {
  return new Prisma.Decimal(value);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function sanitizeText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mapStatus(status: CalculationStatus): CalculationStatusValue {
  return status as CalculationStatusValue;
}

function roundQuantity(value: number) {
  return Math.round(value * 10000) / 10000;
}

function mapMaterial(material: Material) {
  return {
    id: material.id,
    name: material.name,
    stockUnit: material.stockUnit || material.unit,
    averageCost: toNumber(material.averageCost),
    unitCost: toNumber(material.unitCost),
    costPrice: toNumber(material.costPrice)
  };
}

@Injectable()
export class CalculationsService {
  constructor(private readonly prisma: PrismaService) {}

  private async nextNumber(tx: Prisma.TransactionClient) {
    const sequence = await tx.numberSequence.upsert({
      where: { key: 'calculation' },
      update: {
        prefix: 'HS-'
      },
      create: {
        key: 'calculation',
        prefix: 'HS-',
        currentValue: 0,
        step: 1,
        padding: 6
      }
    });

    const nextValue = sequence.currentValue + sequence.step;
    await tx.numberSequence.update({
      where: { key: 'calculation' },
      data: { currentValue: nextValue, prefix: 'HS-' }
    });

    return `HS-${String(nextValue).padStart(6, '0')}`;
  }

  private async ensureDefaultCustomer(tx: Prisma.TransactionClient) {
    const name = 'Müştəri';
    const customer = await tx.customer.findFirst({
      where: {
        name,
        deletedAt: null
      }
    });

    if (customer) {
      return customer;
    }

    return tx.customer.create({
      data: {
        name,
        companyName: null,
        isActive: true
      }
    });
  }

  private async loadMaterialRecords(tx: Prisma.TransactionClient, materialLines: CreateCalculationDto['materialLines']) {
    const ids = [...new Set(materialLines.map((line) => line.materialId))];
    const materials = await tx.material.findMany({
      where: {
        id: { in: ids },
        deletedAt: null
      },
      include: {
        stockLevels: true
      }
    });

    if (materials.length !== ids.length) {
      throw new BadRequestException('Seçilmiş material tapılmadı');
    }

    return new Map(materials.map((material) => [material.id, material]));
  }

  private normalizeMaterialLines(materialLines: CreateCalculationDto['materialLines'], materialMap: Map<string, Material & { stockLevels: Array<{ available: Prisma.Decimal | number | string }> }>) {
    return materialLines.map((line) => {
      const material = materialMap.get(line.materialId);
      if (!material) {
        throw new BadRequestException('Seçilmiş material tapılmadı');
      }

      const quantity = Number(line.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new BadRequestException('Material miqdarı 0-dan böyük olmalıdır');
      }

      const unitCost = line.unitCost != null ? Number(line.unitCost) : toNumber(material.averageCost || material.unitCost || material.costPrice || 0);
      const availableStock = roundQuantity((material.stockLevels ?? []).reduce((sum, level) => sum + toNumber(level.available), 0));
      const totalCost = roundMoney(quantity * (Number.isFinite(unitCost) ? unitCost : 0));

      return {
        materialId: material.id,
        materialName: material.name,
        quantity: roundQuantity(quantity),
        unit: line.unit.trim(),
        unitCost: roundMoney(Number.isFinite(unitCost) ? unitCost : 0),
        totalCost,
        availableStock
      };
    });
  }

  private normalizeServiceLines(serviceLines: CreateCalculationDto['serviceLines']) {
    return serviceLines.map((line) => {
      const quantity = Number(line.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new BadRequestException('Xidmət miqdarı 0-dan böyük olmalıdır');
      }

      const unitPrice = line.unitPrice != null ? Number(line.unitPrice) : 0;
      const totalCost = roundMoney(quantity * (Number.isFinite(unitPrice) ? unitPrice : 0));

      return {
        serviceName: line.serviceName.trim(),
        quantity: roundQuantity(quantity),
        unit: line.unit.trim(),
        unitPrice: roundMoney(Number.isFinite(unitPrice) ? unitPrice : 0),
        totalCost
      };
    });
  }

  private async buildCalculationRecord(
    tx: Prisma.TransactionClient,
    dto: CreateCalculationDto,
    existing?: PrismaCalculation & { sections: Prisma.JsonValue }
  ) {
    const customer = await this.ensureDefaultCustomer(tx);
    const materialLines = await this.loadMaterialRecords(tx, dto.materialLines);
    const normalizedMaterialLines = this.normalizeMaterialLines(dto.materialLines, materialLines);
    const normalizedServiceLines = this.normalizeServiceLines(dto.serviceLines);

    const materialCost = roundMoney(normalizedMaterialLines.reduce((sum, line) => sum + line.totalCost, 0));
    const serviceCost = roundMoney(normalizedServiceLines.reduce((sum, line) => sum + line.totalCost, 0));
    const totalCost = roundMoney(materialCost + serviceCost);
    const profitPercent = Number(dto.profitPercent ?? 0);
    const profitAmount = roundMoney((totalCost * profitPercent) / 100);
    const salePrice = roundMoney(totalCost + profitAmount);
    const finalPrice = roundMoney(dto.finalPrice != null ? Number(dto.finalPrice) : salePrice);
    const realizedProfit = roundMoney(finalPrice - totalCost);

    return {
      customer,
      data: {
        customerId: customer.id,
        customerName: dto.customerName?.trim() || existing?.customerName || customer.name,
        productName: dto.productName.trim(),
        quantity: toDecimal(dto.quantity),
        note: sanitizeText(dto.note),
        status: dto.status ?? (existing ? mapStatus(existing.status) : 'draft'),
        materialCost: toDecimal(materialCost),
        serviceCost: toDecimal(serviceCost),
        totalCost: toDecimal(totalCost),
        profitPercent: toDecimal(profitPercent),
        profitAmount: toDecimal(profitAmount),
        salePrice: toDecimal(salePrice),
        finalPrice: toDecimal(finalPrice),
        costPrice: toDecimal(totalCost),
        profit: toDecimal(realizedProfit),
        sections: {
          materialLines: normalizedMaterialLines,
          serviceLines: normalizedServiceLines
        },
        cancelledAt: dto.status === 'cancelled' ? new Date() : existing?.cancelledAt ?? null
      }
    };
  }

  private serialize(calculation: any): CalculationResponse {
    const sections = (typeof calculation.sections === 'object' && calculation.sections != null ? calculation.sections : {}) as {
      materialLines?: CalculationMaterialLineRecord[];
      serviceLines?: CalculationServiceLineRecord[];
    };

    return {
      id: calculation.id,
      number: calculation.number,
      customerName: calculation.customerName ?? calculation.customer?.name ?? 'Müştəri',
      productName: calculation.productName,
      quantity: toNumber(calculation.quantity),
      note: calculation.note,
      status: mapStatus(calculation.status),
      materialCost: toNumber(calculation.materialCost ?? calculation.costPrice),
      serviceCost: toNumber(calculation.serviceCost),
      totalCost: toNumber(calculation.totalCost ?? calculation.costPrice),
      profitPercent: toNumber(calculation.profitPercent),
      profitAmount: toNumber(calculation.profitAmount ?? calculation.profit),
      salePrice: toNumber(calculation.salePrice),
      finalPrice: toNumber(calculation.finalPrice ?? calculation.salePrice),
      costPrice: toNumber(calculation.costPrice ?? calculation.totalCost),
      profit: toNumber(calculation.profit ?? calculation.profitAmount),
      sections: {
        materialLines: sections.materialLines ?? [],
        serviceLines: sections.serviceLines ?? []
      },
      createdAt: calculation.createdAt.toISOString(),
      updatedAt: calculation.updatedAt.toISOString(),
      cancelledAt: calculation.cancelledAt ? calculation.cancelledAt.toISOString() : null
    };
  }

  private async loadCalculationOrThrow(id: string) {
    const calculation = await this.prisma.calculation.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: true
      }
    });

    if (!calculation) {
      throw new NotFoundException('Hesablama tapılmadı');
    }

    return calculation;
  }

  async findAll(query: CalculationListQueryDto) {
    const { page, limit, skip, take } = normalizePagination(query);
    const search = query.search?.trim();

    const where: Prisma.CalculationWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { number: { contains: search, mode: 'insensitive' } },
              { customerName: { contains: search, mode: 'insensitive' } },
              { productName: { contains: search, mode: 'insensitive' } },
              { note: { contains: search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [total, calculations] = await this.prisma.$transaction([
      this.prisma.calculation.count({ where }),
      this.prisma.calculation.findMany({
        where,
        include: { customer: true },
        orderBy: [{ createdAt: 'desc' }, { updatedAt: 'desc' }],
        skip,
        take
      })
    ]);

    return buildPaginatedResponse(calculations.map((calculation) => this.serialize(calculation)), total, page, limit);
  }

  async findOne(id: string) {
    return this.serialize(await this.loadCalculationOrThrow(id));
  }

  async create(dto: CreateCalculationDto) {
    if (!dto.materialLines?.length && !dto.serviceLines?.length) {
      throw new BadRequestException('Ən azı 1 material və ya xidmət sətri olmalıdır');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const number = await this.nextNumber(tx);
      const payload = await this.buildCalculationRecord(tx, dto);

      const created = await tx.calculation.create({
        data: {
          number,
          ...payload.data,
          status: dto.status ?? 'draft'
        }
      });

      return tx.calculation.findUnique({
        where: { id: created.id },
        include: { customer: true }
      });
    });

    if (!result) {
      throw new BadRequestException('Hesablama yaradılmadı');
    }

    return this.serialize(result);
  }

  async update(id: string, dto: UpdateCalculationDto) {
    const existing = await this.loadCalculationOrThrow(id);

    if (existing.status !== CalculationStatus.draft) {
      throw new BadRequestException('Yalnız qaralama hesablamalar redaktə oluna bilər');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const current = await tx.calculation.findUnique({
        where: { id },
        include: { customer: true }
      });

      if (!current) {
        throw new NotFoundException('Hesablama tapılmadı');
      }

      const nextDto: CreateCalculationDto = {
        customerName: dto.customerName ?? current.customerName ?? current.customer?.name ?? 'Müştəri',
        productName: dto.productName ?? current.productName,
        quantity: dto.quantity ?? toNumber(current.quantity),
        note: dto.note ?? current.note ?? undefined,
        profitPercent: dto.profitPercent ?? toNumber(current.profitPercent),
        finalPrice: dto.finalPrice ?? toNumber(current.finalPrice),
        status: dto.status ?? mapStatus(current.status),
        materialLines: (dto.materialLines ?? (current.sections as any)?.materialLines ?? []) as CreateCalculationDto['materialLines'],
        serviceLines: (dto.serviceLines ?? (current.sections as any)?.serviceLines ?? []) as CreateCalculationDto['serviceLines']
      };

      const payload = await this.buildCalculationRecord(tx, nextDto, current);

      await tx.calculation.update({
        where: { id },
        data: {
          customerId: payload.customer.id,
          customerName: payload.data.customerName,
          productName: payload.data.productName,
          quantity: payload.data.quantity,
          note: payload.data.note,
          status: payload.data.status,
          materialCost: payload.data.materialCost,
          serviceCost: payload.data.serviceCost,
          totalCost: payload.data.totalCost,
          profitPercent: payload.data.profitPercent,
          profitAmount: payload.data.profitAmount,
          salePrice: payload.data.salePrice,
          finalPrice: payload.data.finalPrice,
          costPrice: payload.data.costPrice,
          profit: payload.data.profit,
          sections: payload.data.sections,
          cancelledAt: payload.data.cancelledAt
        }
      });

      return tx.calculation.findUnique({
        where: { id },
        include: { customer: true }
      });
    });

    if (!result) {
      throw new BadRequestException('Hesablama yenilənmədi');
    }

    return this.serialize(result);
  }

  async remove(id: string) {
    const existing = await this.loadCalculationOrThrow(id);

    if (existing.status === CalculationStatus.converted) {
      throw new BadRequestException('Çevrilmiş hesablamanı silmək olmaz');
    }

    await this.prisma.calculation.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    return { success: true };
  }

  async approve(id: string) {
    const existing = await this.loadCalculationOrThrow(id);

    if (existing.status !== CalculationStatus.draft) {
      throw new BadRequestException('Yalnız qaralama hesablama təsdiqlənə bilər');
    }

    await this.prisma.calculation.update({
      where: { id },
      data: {
        status: CalculationStatus.approved
      }
    });

    return this.serialize(await this.loadCalculationOrThrow(id));
  }

  async cancel(id: string) {
    const existing = await this.loadCalculationOrThrow(id);

    if (existing.status === CalculationStatus.converted) {
      throw new BadRequestException('Çevrilmiş hesablama ləğv edilə bilməz');
    }

    await this.prisma.calculation.update({
      where: { id },
      data: {
        status: CalculationStatus.cancelled,
        cancelledAt: new Date()
      }
    });

    return this.serialize(await this.loadCalculationOrThrow(id));
  }
}
