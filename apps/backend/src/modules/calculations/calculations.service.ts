import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CalculationStatus, Prisma, type Calculation as PrismaCalculation, type Material } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buildPaginatedResponse, normalizePagination } from '../../common/query/pagination';
import {
  CalculationListQueryDto,
  CreateCalculationDto,
  UpdateCalculationDto,
  type CalculationBlockTypeValue,
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

type CalculationBlockRecord = {
  id: string;
  type: CalculationBlockTypeValue | string;
  title: string;
  linkedBlockId?: string | null;
  values?: Record<string, unknown> | null;
  computed?: Record<string, unknown> | null;
};

type CalculationSummaryRecord = {
  paperAmount: number;
  printAmount: number;
  formAmount: number;
  laminationAmount: number;
  otherCostAmount: number;
  totalCost: number;
  profitPercent: number;
  profitAmount: number;
  recommendedSalePrice: number;
  finalPrice: number;
  realProfit: number;
  realProfitPercent: number;
  materialCost: number;
  serviceCost: number;
  salePrice: number;
};

type CalculationResponse = {
  id: string;
  number: string;
  date?: string | null;
  customerId: string;
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
    blocks: CalculationBlockRecord[];
    summary: CalculationSummaryRecord;
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

function roundBlockNumber(value: number) {
  return Math.round(value * 100) / 100;
}

function readNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function extractTotal(block: CalculationBlockRecord) {
  const computedTotal = block.computed?.total;
  if (computedTotal != null) {
    return readNumber(computedTotal);
  }

  const valuesTotal = block.values?.total;
  if (valuesTotal != null) {
    return readNumber(valuesTotal);
  }

  return 0;
}

function normalizeBlocks(blocks: unknown): CalculationBlockRecord[] {
  if (!Array.isArray(blocks)) {
    return [];
  }

  return blocks
    .map((block) => {
      if (!block || typeof block !== 'object') {
        return null;
      }

      const candidate = block as CalculationBlockRecord;
      if (typeof candidate.id !== 'string' || typeof candidate.type !== 'string' || typeof candidate.title !== 'string') {
        return null;
      }

      return {
        id: candidate.id,
        type: candidate.type,
        title: candidate.title,
        linkedBlockId: typeof candidate.linkedBlockId === 'string' ? candidate.linkedBlockId : null,
        values: candidate.values && typeof candidate.values === 'object' ? candidate.values : {},
        computed: candidate.computed && typeof candidate.computed === 'object' ? candidate.computed : {}
      } satisfies CalculationBlockRecord;
    })
    .filter(Boolean) as CalculationBlockRecord[];
}

function buildSummaryFromBlocks(
  blocks: CalculationBlockRecord[],
  profitPercentInput?: number | null,
  finalPriceInput?: number | null
): CalculationSummaryRecord {
  const paperAmount = roundBlockNumber(
    blocks.filter((block) => block.type === 'paper').reduce((sum, block) => sum + extractTotal(block), 0)
  );
  const printAmount = roundBlockNumber(
    blocks.filter((block) => block.type === 'printing').reduce((sum, block) => sum + extractTotal(block), 0)
  );
  const formAmount = roundBlockNumber(
    blocks.filter((block) => block.type === 'form').reduce((sum, block) => sum + extractTotal(block), 0)
  );
  const laminationAmount = roundBlockNumber(
    blocks.filter((block) => block.type === 'lamination').reduce((sum, block) => sum + extractTotal(block), 0)
  );
  const otherCostAmount = roundBlockNumber(
    blocks.filter((block) => block.type === 'service').reduce((sum, block) => sum + extractTotal(block), 0)
  );
  const totalCost = roundBlockNumber(paperAmount + printAmount + formAmount + laminationAmount + otherCostAmount);
  const profitPercent = roundBlockNumber(readNumber(profitPercentInput));
  const profitAmount = roundBlockNumber((totalCost * profitPercent) / 100);
  const recommendedSalePrice = roundBlockNumber(totalCost + profitAmount);
  const finalPrice = roundBlockNumber(finalPriceInput != null ? readNumber(finalPriceInput) : recommendedSalePrice);
  const realProfit = roundBlockNumber(finalPrice - totalCost);
  const realProfitPercent = totalCost > 0 ? roundBlockNumber((realProfit / totalCost) * 100) : 0;
  const serviceCost = roundBlockNumber(printAmount + formAmount + laminationAmount + otherCostAmount);

  return {
    paperAmount,
    printAmount,
    formAmount,
    laminationAmount,
    otherCostAmount,
    totalCost,
    profitPercent,
    profitAmount,
    recommendedSalePrice,
    finalPrice,
    realProfit,
    realProfitPercent,
    materialCost: paperAmount,
    serviceCost,
    salePrice: recommendedSalePrice
  };
}

function buildSummaryFromLegacyLines(
  materialLines: CalculationMaterialLineRecord[],
  serviceLines: CalculationServiceLineRecord[],
  profitPercentInput?: number | null,
  finalPriceInput?: number | null
): CalculationSummaryRecord {
  const paperAmount = roundBlockNumber(materialLines.reduce((sum, line) => sum + line.totalCost, 0));
  const otherCostAmount = roundBlockNumber(serviceLines.reduce((sum, line) => sum + line.totalCost, 0));
  const totalCost = roundBlockNumber(paperAmount + otherCostAmount);
  const profitPercent = roundBlockNumber(readNumber(profitPercentInput));
  const profitAmount = roundBlockNumber((totalCost * profitPercent) / 100);
  const recommendedSalePrice = roundBlockNumber(totalCost + profitAmount);
  const finalPrice = roundBlockNumber(finalPriceInput != null ? readNumber(finalPriceInput) : recommendedSalePrice);
  const realProfit = roundBlockNumber(finalPrice - totalCost);
  const realProfitPercent = totalCost > 0 ? roundBlockNumber((realProfit / totalCost) * 100) : 0;

  return {
    paperAmount,
    printAmount: 0,
    formAmount: 0,
    laminationAmount: 0,
    otherCostAmount,
    totalCost,
    profitPercent,
    profitAmount,
    recommendedSalePrice,
    finalPrice,
    realProfit,
    realProfitPercent,
    materialCost: paperAmount,
    serviceCost: otherCostAmount,
    salePrice: recommendedSalePrice
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

  private async resolveCustomer(tx: Prisma.TransactionClient, customerId?: string) {
    if (customerId) {
      const customer = await tx.customer.findFirst({
        where: {
          id: customerId,
          deletedAt: null
        }
      });

      if (customer) {
        return customer;
      }
    }

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

  private async loadMaterialRecords(tx: Prisma.TransactionClient, materialLines: NonNullable<CreateCalculationDto['materialLines']>) {
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

  private normalizeMaterialLines(materialLines: NonNullable<CreateCalculationDto['materialLines']>, materialMap: Map<string, Material & { stockLevels: Array<{ available: Prisma.Decimal | number | string }> }>) {
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

  private normalizeServiceLines(serviceLines: NonNullable<CreateCalculationDto['serviceLines']>) {
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
    const customer = await this.resolveCustomer(tx, dto.customerId);
    const hasBlocks = Array.isArray(dto.sections?.blocks) && dto.sections!.blocks!.length > 0;
    const materialLinesInput = dto.materialLines ?? [];
    const serviceLinesInput = dto.serviceLines ?? [];
    const materialLines =
      materialLinesInput.length > 0
        ? await this.loadMaterialRecords(tx, materialLinesInput)
        : new Map<string, Material & { stockLevels: Array<{ available: Prisma.Decimal | number | string }> }>();
    const normalizedMaterialLines = materialLinesInput.length > 0 ? this.normalizeMaterialLines(materialLinesInput, materialLines) : [];
    const normalizedServiceLines = serviceLinesInput.length > 0 ? this.normalizeServiceLines(serviceLinesInput) : [];
    const normalizedBlocks = hasBlocks ? normalizeBlocks(dto.sections?.blocks) : [];
    const summary = hasBlocks
      ? buildSummaryFromBlocks(normalizedBlocks, dto.profitPercent ?? undefined, dto.finalPrice ?? undefined)
      : buildSummaryFromLegacyLines(normalizedMaterialLines, normalizedServiceLines, dto.profitPercent ?? undefined, dto.finalPrice ?? undefined);

    return {
      customer,
      data: {
        customerId: customer.id,
        customerName: dto.customerName?.trim() || existing?.customerName || customer.name,
        date: dto.date ? new Date(dto.date) : existing?.date ?? new Date(),
        productName: dto.productName.trim(),
        quantity: toDecimal(dto.quantity),
        note: sanitizeText(dto.note),
        status: dto.status ?? (existing ? mapStatus(existing.status) : 'draft'),
        materialCost: toDecimal(summary.materialCost),
        serviceCost: toDecimal(summary.serviceCost),
        totalCost: toDecimal(summary.totalCost),
        profitPercent: toDecimal(summary.profitPercent),
        profitAmount: toDecimal(summary.profitAmount),
        salePrice: toDecimal(summary.salePrice),
        finalPrice: toDecimal(summary.finalPrice),
        costPrice: toDecimal(summary.totalCost),
        profit: toDecimal(summary.realProfit),
        sections: hasBlocks
          ? {
              blocks: normalizedBlocks,
              summary
            }
          : {
              materialLines: normalizedMaterialLines,
              serviceLines: normalizedServiceLines,
              summary
            },
        cancelledAt: dto.status === 'cancelled' ? new Date() : existing?.cancelledAt ?? null
      }
    };
  }

  private serialize(calculation: any): CalculationResponse {
    const sections = (typeof calculation.sections === 'object' && calculation.sections != null ? calculation.sections : {}) as {
      blocks?: CalculationBlockRecord[];
      materialLines?: CalculationMaterialLineRecord[];
      serviceLines?: CalculationServiceLineRecord[];
      summary?: CalculationSummaryRecord;
    };

    return {
      id: calculation.id,
      number: calculation.number,
      date: calculation.date ? calculation.date.toISOString().slice(0, 10) : null,
      customerId: calculation.customerId,
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
        blocks: sections.blocks ?? [],
        materialLines: sections.materialLines ?? [],
        serviceLines: sections.serviceLines ?? [],
        summary:
          sections.summary ?? {
            paperAmount: toNumber(calculation.materialCost ?? 0),
            printAmount: 0,
            formAmount: 0,
            laminationAmount: 0,
            otherCostAmount: toNumber(calculation.serviceCost ?? 0),
            totalCost: toNumber(calculation.totalCost ?? 0),
            profitPercent: toNumber(calculation.profitPercent ?? 0),
            profitAmount: toNumber(calculation.profitAmount ?? 0),
            recommendedSalePrice: toNumber(calculation.salePrice ?? 0),
            finalPrice: toNumber(calculation.finalPrice ?? calculation.salePrice ?? 0),
            realProfit: toNumber(calculation.profit ?? calculation.profitAmount ?? 0),
            realProfitPercent:
              toNumber(calculation.totalCost ?? 0) > 0
                ? roundBlockNumber((toNumber(calculation.profit ?? calculation.profitAmount ?? 0) / toNumber(calculation.totalCost ?? 0)) * 100)
                : 0,
            materialCost: toNumber(calculation.materialCost ?? 0),
            serviceCost: toNumber(calculation.serviceCost ?? 0),
            salePrice: toNumber(calculation.salePrice ?? 0)
          }
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
    if (!dto.sections?.blocks?.length && !dto.materialLines?.length && !dto.serviceLines?.length) {
      throw new BadRequestException('Ən azı 1 material və ya xidmət sətri olmalıdır');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const number = await this.nextNumber(tx);
      const payload = await this.buildCalculationRecord(tx, dto);
      const createData: Prisma.CalculationUncheckedCreateInput = {
        number,
        ...payload.data,
        sections: payload.data.sections as Prisma.InputJsonValue,
        status: dto.status ?? 'draft'
      };

      const created = await tx.calculation.create({
        data: createData
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
        customerId: dto.customerId ?? current.customerId,
        date: dto.date ?? current.date?.toISOString().slice(0, 10) ?? undefined,
        customerName: dto.customerName ?? current.customerName ?? current.customer?.name ?? 'Müştəri',
        productName: dto.productName ?? current.productName,
        quantity: dto.quantity ?? toNumber(current.quantity),
        note: dto.note ?? current.note ?? undefined,
        profitPercent: dto.profitPercent ?? toNumber(current.profitPercent),
        finalPrice: dto.finalPrice ?? toNumber(current.finalPrice),
        status: dto.status ?? mapStatus(current.status),
        materialLines: (dto.materialLines ?? (current.sections as any)?.materialLines ?? []) as CreateCalculationDto['materialLines'],
        serviceLines: (dto.serviceLines ?? (current.sections as any)?.serviceLines ?? []) as CreateCalculationDto['serviceLines'],
        sections: (dto.sections ?? (current.sections as any)) as CreateCalculationDto['sections']
      };

      const payload = await this.buildCalculationRecord(tx, nextDto, current);
      const updateData: Prisma.CalculationUncheckedUpdateInput = {
        customerId: payload.customer.id,
        customerName: payload.data.customerName,
        date: payload.data.date,
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
        sections: payload.data.sections as Prisma.InputJsonValue,
        cancelledAt: payload.data.cancelledAt
      };

      await tx.calculation.update({
        where: { id },
        data: updateData
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
