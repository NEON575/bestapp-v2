import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Material, type Purchase as PrismaPurchase, type PurchaseItem as PrismaPurchaseItem } from '@prisma/client';
import { buildPurchaseMovement } from '../../common/business/purchase-flow';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WarehouseService } from '../warehouse/warehouse.service';
import { CreatePurchaseDto, PurchaseListQueryDto, UpdatePurchaseDto } from './dto/purchases.dto';

type PurchaseStatus = 'draft' | 'confirmed' | 'cancelled';
type PurchaseQuantityMode = 'base' | 'package' | 'pallet';
type PurchaseCurrencyCode = 'AZN' | 'USD' | 'EUR' | 'TRY';

type PurchaseMaterialSummary = {
  id: string;
  materialNo: string;
  name: string;
  stockUnit: string;
  packageUnit?: string | null;
  defaultUnitsPerPackage?: number | null;
  palletUnit?: string | null;
  packagesPerPallet?: number | null;
  defaultUnitsPerPallet?: number | null;
  unit: string;
};

type PurchaseItemResponse = {
  id: string;
  purchaseId: string;
  materialId: string;
  quantityMode: PurchaseQuantityMode;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  vatAmount: number;
  netAmount: number;
  baseQuantity: number;
  baseUnit: string;
  lineTotal: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  material?: PurchaseMaterialSummary | null;
};

type PurchaseResponse = {
  id: string;
  purchaseNo: string;
  invoiceNo: string;
  warehouseId?: string | null;
  purchaseDate: string;
  supplierName: string;
  currencyCode: PurchaseCurrencyCode;
  exchangeRate: number;
  status: PurchaseStatus;
  subtotal: number;
  vatTotal: number;
  total: number;
  notes?: string | null;
  confirmedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  items: PurchaseItemResponse[];
};

type PurchaseItemInput = {
  materialId: string;
  quantityMode: PurchaseQuantityMode;
  quantity: number;
  unitPrice: number;
  vatRate?: number;
  isVatIncluded?: boolean;
  notes?: string | null;
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

function sanitizeText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mapMaterial(material: Material | null | undefined): PurchaseMaterialSummary | null {
  if (!material) {
    return null;
  }

  return {
    id: material.id,
    materialNo: material.materialNo,
    name: material.name,
    stockUnit: material.stockUnit,
    packageUnit: material.packageUnit,
    defaultUnitsPerPackage: material.defaultUnitsPerPackage == null ? null : toNumber(material.defaultUnitsPerPackage),
    palletUnit: material.palletUnit,
    packagesPerPallet: material.packagesPerPallet == null ? null : toNumber(material.packagesPerPallet),
    defaultUnitsPerPallet: material.defaultUnitsPerPallet == null ? null : toNumber(material.defaultUnitsPerPallet),
    unit: material.unit
  };
}

function mapPurchaseItem(item: PrismaPurchaseItem & { material?: Material | null }): PurchaseItemResponse {
  return {
    id: item.id,
    purchaseId: item.purchaseId,
    materialId: item.materialId,
    quantityMode: item.quantityMode as PurchaseQuantityMode,
    quantity: toNumber(item.quantity),
    unitPrice: toNumber(item.unitPrice),
    vatRate: toNumber(item.vatRate),
    vatAmount: toNumber(item.vatAmount),
    netAmount: toNumber(item.netAmount),
    baseQuantity: toNumber(item.baseQuantity),
    baseUnit: item.baseUnit,
    lineTotal: toNumber(item.lineTotal),
    notes: item.notes,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    material: mapMaterial(item.material)
  };
}

function mapPurchase(purchase: PrismaPurchase & { items?: Array<PrismaPurchaseItem & { material?: Material | null }> }): PurchaseResponse {
  return {
    id: purchase.id,
    purchaseNo: purchase.purchaseNo,
    invoiceNo: purchase.invoiceNo ?? '',
    warehouseId: purchase.warehouseId,
    purchaseDate: purchase.purchaseDate.toISOString(),
    supplierName: purchase.supplierName,
    currencyCode: purchase.currencyCode as PurchaseCurrencyCode,
    exchangeRate: toNumber(purchase.exchangeRate),
    status: purchase.status as PurchaseStatus,
    subtotal: toNumber(purchase.subtotal),
    vatTotal: toNumber(purchase.vatTotal),
    total: toNumber(purchase.total),
    notes: purchase.notes,
    confirmedAt: purchase.confirmedAt ? purchase.confirmedAt.toISOString() : null,
    cancelledAt: purchase.cancelledAt ? purchase.cancelledAt.toISOString() : null,
    createdAt: purchase.createdAt.toISOString(),
    updatedAt: purchase.updatedAt.toISOString(),
    items: (purchase.items ?? []).map(mapPurchaseItem)
  };
}

function computeBaseQuantity(material: Material, quantityMode: PurchaseQuantityMode, quantity: number) {
  if (quantityMode === 'base') {
    return quantity;
  }

  if (quantityMode === 'package') {
    if (material.defaultUnitsPerPackage == null) {
      throw new BadRequestException(`"${material.name}" material üçün qablaşdırma məlumatı yoxdur`);
    }

    return quantity * toNumber(material.defaultUnitsPerPackage);
  }

  if (material.defaultUnitsPerPallet == null) {
    throw new BadRequestException(`"${material.name}" material üçün palet məlumatı yoxdur`);
  }

  return quantity * toNumber(material.defaultUnitsPerPallet);
}

function resolveVatRate(item: PurchaseItemInput) {
  if (item.vatRate != null && Number.isFinite(Number(item.vatRate))) {
    return Number(item.vatRate) > 0 ? Number(item.vatRate) : 0;
  }

  return item.isVatIncluded ? 18 : 0;
}

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly warehouseService: WarehouseService
  ) {}

  private async nextPurchaseNo(tx: Prisma.TransactionClient) {
    const sequence = await tx.numberSequence.upsert({
      where: { key: 'purchase' },
      update: {},
      create: {
        key: 'purchase',
        prefix: 'AL-',
        currentValue: 0,
        step: 1,
        padding: 6
      }
    });

    const nextValue = sequence.currentValue + sequence.step;
    await tx.numberSequence.update({
      where: { key: 'purchase' },
      data: { currentValue: nextValue }
    });

    return `${sequence.prefix}${String(nextValue).padStart(sequence.padding, '0')}`;
  }

  private async nextInvoiceNo(tx: Prisma.TransactionClient) {
    const sequence = await tx.numberSequence.upsert({
      where: { key: 'purchase_invoice' },
      update: {},
      create: {
        key: 'purchase_invoice',
        prefix: 'F-',
        currentValue: 0,
        step: 1,
        padding: 6
      }
    });

    const nextValue = sequence.currentValue + sequence.step;
    await tx.numberSequence.update({
      where: { key: 'purchase_invoice' },
      data: { currentValue: nextValue }
    });

    return `${sequence.prefix}${String(nextValue).padStart(sequence.padding, '0')}`;
  }

  private async loadPurchaseOrThrow(id: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    const purchase = await db.purchase.findFirst({
      where: { id },
      include: { items: { include: { material: true } } }
    });

    if (!purchase) {
      throw new NotFoundException('Alış tapılmadı');
    }

    return purchase;
  }

  private async buildPurchaseItems(tx: Prisma.TransactionClient, items: PurchaseItemInput[]) {
    const uniqueMaterialIds = [...new Set(items.map((item) => item.materialId))];
    const materials = await tx.material.findMany({
      where: {
        id: { in: uniqueMaterialIds },
        deletedAt: null
      }
    });

    if (materials.length !== uniqueMaterialIds.length) {
      throw new BadRequestException('Seçilmiş material tapılmadı');
    }

    const materialMap = new Map(materials.map((material) => [material.id, material]));

    return items.map((item) => {
      const material = materialMap.get(item.materialId);
      if (!material) {
        throw new BadRequestException('Seçilmiş material tapılmadı');
      }

      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      const vatRate = resolveVatRate(item);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new BadRequestException('Miqdar 0-dan böyük olmalıdır');
      }

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new BadRequestException('Vahid qiymət 0 və ya daha böyük olmalıdır');
      }

      const baseQuantity = computeBaseQuantity(material, item.quantityMode, quantity);
      const netAmount = quantity * unitPrice;
      const vatAmount = (netAmount * vatRate) / 100;
      const lineTotal = netAmount + vatAmount;

      return {
        materialId: material.id,
        quantityMode: item.quantityMode,
        quantity: toDecimal(quantity),
        unitPrice: toDecimal(unitPrice),
        vatRate: toDecimal(vatRate),
        vatAmount: toDecimal(vatAmount),
        netAmount: toDecimal(netAmount),
        baseQuantity: toDecimal(baseQuantity),
        baseUnit: material.stockUnit || material.unit,
        lineTotal: toDecimal(lineTotal),
        notes: sanitizeText(item.notes)
      };
    });
  }

  private async applyPurchaseReceipt(tx: Prisma.TransactionClient, purchaseId: string) {
    const existing = await this.loadPurchaseOrThrow(purchaseId, tx);

    if (existing.status === 'cancelled' || existing.cancelledAt) {
      throw new BadRequestException('Ləğv edilmiş alış təsdiqlənə bilməz');
    }

    if (existing.status === 'confirmed' || existing.confirmedAt) {
      return existing;
    }

    const warehouse = await this.warehouseService.findWarehouseOrMain(existing.warehouseId, tx);
    const reference = [existing.purchaseNo, existing.invoiceNo].filter(Boolean).join(' / ');
    const uniqueMaterialIds = new Set<string>();

    for (const item of existing.items) {
      const baseQuantity = toNumber(item.baseQuantity);
      const lineTotal = toNumber(item.lineTotal);
      const unitCost = baseQuantity > 0 ? lineTotal / baseQuantity : 0;

      await tx.stockMovement.create({
        data: {
          ...buildPurchaseMovement({
            materialId: item.materialId,
            warehouseId: warehouse.id,
            totalQuantity: baseQuantity,
            unitPrice: unitCost,
            totalAmount: lineTotal,
            reference,
            note: 'Alış təsdiqi'
          })
        }
      });

      uniqueMaterialIds.add(item.materialId);
    }

    for (const materialId of uniqueMaterialIds) {
      await this.warehouseService.syncStockLevel(materialId, warehouse.id, tx);
    }

    const updated = await tx.purchase.update({
      where: { id: purchaseId },
      data: {
        warehouseId: existing.warehouseId ?? warehouse.id,
        status: 'confirmed',
        confirmedAt: new Date(),
        cancelledAt: null
      },
      include: { items: { include: { material: true } } }
    });

    return updated;
  }

  private async applyPurchaseCancellation(tx: Prisma.TransactionClient, purchaseId: string) {
    const existing = await this.loadPurchaseOrThrow(purchaseId, tx);

    if (existing.status === 'confirmed' || existing.confirmedAt) {
      throw new BadRequestException('Təsdiqlənmiş alış ləğv edilə bilməz');
    }

    if (existing.status === 'cancelled' || existing.cancelledAt) {
      return existing;
    }

    return tx.purchase.update({
      where: { id: purchaseId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date()
      },
      include: { items: { include: { material: true } } }
    });
  }

  async list(query: PurchaseListQueryDto) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const where: Prisma.PurchaseWhereInput = {
      ...(search
        ? {
            OR: [
              { purchaseNo: { contains: search, mode: 'insensitive' } },
              { invoiceNo: { contains: search, mode: 'insensitive' } },
              { supplierName: { contains: search, mode: 'insensitive' } }
            ]
          }
        : {}),
      ...(query.status && query.status !== 'all' ? { status: query.status } : {})
    };

    const [total, purchases] = await this.prisma.$transaction([
      this.prisma.purchase.count({ where }),
      this.prisma.purchase.findMany({
        where,
        include: { items: { include: { material: true } } },
        orderBy: [{ purchaseDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit
      })
    ]);

    return {
      data: purchases.map(mapPurchase),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    };
  }

  async getById(id: string) {
    return mapPurchase(await this.loadPurchaseOrThrow(id));
  }

  async create(dto: CreatePurchaseDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('Ən azı 1 alış sətiri olmalıdır');
    }

    const purchaseDate = dto.purchaseDate ? new Date(dto.purchaseDate) : new Date();
    const supplierName = dto.supplierName.trim();

    if (!supplierName) {
      throw new BadRequestException('Təchizatçı adı boş ola bilməz');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const purchaseNo = await this.nextPurchaseNo(tx);
      const invoiceNo = await this.nextInvoiceNo(tx);
      const items = await this.buildPurchaseItems(tx, dto.items as PurchaseItemInput[]);
      const subtotal = items.reduce((sum, item) => sum + toNumber(item.netAmount), 0);
      const vatTotal = items.reduce((sum, item) => sum + toNumber(item.vatAmount), 0);
      const total = items.reduce((sum, item) => sum + toNumber(item.lineTotal), 0);
      const warehouse = await this.warehouseService.findWarehouseOrMain(dto.warehouseId, tx);

      const purchase = await tx.purchase.create({
        data: {
          purchaseNo,
          invoiceNo,
          warehouseId: warehouse.id,
          purchaseDate,
          supplierName,
          currencyCode: dto.currencyCode ?? 'AZN',
          exchangeRate: toDecimal(dto.exchangeRate ?? 1),
          status: 'draft',
          subtotal: toDecimal(subtotal),
          vatTotal: toDecimal(vatTotal),
          total: toDecimal(total),
          notes: sanitizeText(dto.notes)
        }
      });

      await tx.purchaseItem.createMany({
        data: items.map((item) => ({
          purchaseId: purchase.id,
          materialId: item.materialId,
          quantityMode: item.quantityMode,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          vatRate: item.vatRate,
          vatAmount: item.vatAmount,
          netAmount: item.netAmount,
          baseQuantity: item.baseQuantity,
          baseUnit: item.baseUnit,
          lineTotal: item.lineTotal,
          notes: item.notes
        }))
      });

      if (dto.status === 'confirmed') {
        return this.applyPurchaseReceipt(tx, purchase.id);
      }

      if (dto.status === 'cancelled') {
        return this.applyPurchaseCancellation(tx, purchase.id);
      }

      return tx.purchase.findUnique({
        where: { id: purchase.id },
        include: { items: { include: { material: true } } }
      });
    });

    if (!result) {
      throw new BadRequestException('Alış yaradılmadı');
    }

    return mapPurchase(result);
  }

  async update(id: string, dto: UpdatePurchaseDto) {
    const existing = await this.loadPurchaseOrThrow(id);

    if (existing.status !== 'draft') {
      throw new BadRequestException('Yalnız qaralama alışlar redaktə oluna bilər');
    }

    if (dto.items && dto.items.length === 0) {
      throw new BadRequestException('Ən azı 1 alış sətiri olmalıdır');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const purchaseDate = dto.purchaseDate ? new Date(dto.purchaseDate) : existing.purchaseDate;
      const supplierName = dto.supplierName?.trim() || existing.supplierName;
      const warehouse = await this.warehouseService.findWarehouseOrMain(dto.warehouseId ?? existing.warehouseId, tx);
      const itemsInput =
        (dto.items as PurchaseItemInput[] | undefined) ??
        existing.items.map((item) => ({
          materialId: item.materialId,
          quantityMode: item.quantityMode as PurchaseQuantityMode,
          quantity: toNumber(item.quantity),
          unitPrice: toNumber(item.unitPrice),
          vatRate: toNumber(item.vatRate),
          notes: item.notes
        }));

      const items = await this.buildPurchaseItems(tx, itemsInput);
      const subtotal = items.reduce((sum, item) => sum + toNumber(item.netAmount), 0);
      const vatTotal = items.reduce((sum, item) => sum + toNumber(item.vatAmount), 0);
      const total = items.reduce((sum, item) => sum + toNumber(item.lineTotal), 0);

      await tx.purchase.update({
        where: { id },
        data: {
          purchaseDate,
          supplierName,
          warehouseId: warehouse.id,
          currencyCode: dto.currencyCode ?? existing.currencyCode,
          exchangeRate: dto.exchangeRate !== undefined ? toDecimal(dto.exchangeRate) : existing.exchangeRate,
          notes: dto.notes !== undefined ? sanitizeText(dto.notes) : existing.notes,
          subtotal: toDecimal(subtotal),
          vatTotal: toDecimal(vatTotal),
          total: toDecimal(total),
          status: 'draft',
          confirmedAt: null,
          cancelledAt: null
        }
      });

      await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });
      await tx.purchaseItem.createMany({
        data: items.map((item) => ({
          purchaseId: id,
          materialId: item.materialId,
          quantityMode: item.quantityMode,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          vatRate: item.vatRate,
          vatAmount: item.vatAmount,
          netAmount: item.netAmount,
          baseQuantity: item.baseQuantity,
          baseUnit: item.baseUnit,
          lineTotal: item.lineTotal,
          notes: item.notes
        }))
      });

      if (dto.status === 'confirmed') {
        return this.applyPurchaseReceipt(tx, id);
      }

      if (dto.status === 'cancelled') {
        return this.applyPurchaseCancellation(tx, id);
      }

      return tx.purchase.findUnique({
        where: { id },
        include: { items: { include: { material: true } } }
      });
    });

    if (!result) {
      throw new BadRequestException('Alış yenilənmədi');
    }

    return mapPurchase(result);
  }

  async remove(id: string) {
    const existing = await this.loadPurchaseOrThrow(id);

    if (existing.status === 'confirmed' || existing.confirmedAt) {
      throw new BadRequestException('Təsdiqlənmiş alış silinə bilməz');
    }

    await this.prisma.purchase.delete({ where: { id } });
    return { success: true };
  }

  async confirm(id: string) {
    const result = await this.prisma.$transaction(async (tx) => this.applyPurchaseReceipt(tx, id));
    return mapPurchase(result);
  }

  async cancel(id: string) {
    const result = await this.prisma.$transaction(async (tx) => this.applyPurchaseCancellation(tx, id));
    return mapPurchase(result);
  }
}
