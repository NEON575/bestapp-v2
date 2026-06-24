import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Material, type MaterialCategory } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateMaterialDto, MaterialListQueryDto, UpdateMaterialDto } from './dto/materials.dto';
import { MATERIAL_CATEGORIES, type MaterialCategoryCode } from './materials.constants';

type MaterialMetadata = {
  materialType?: string;
  gramThickness?: string;
  formatSize?: string;
  currencyCode?: string;
  purchasePrice?: number;
  aznPrice?: number;
  [key: string]: unknown;
};

type MaterialPackaging = {
  stockUnit: string;
  packageUnit: string | null;
  defaultUnitsPerPackage: number | null;
  palletUnit: string | null;
  packagesPerPallet: number | null;
  defaultUnitsPerPallet: number | null;
};

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value == null) {
    return 0;
  }

  return Number(value.toString());
}

function parseMetadata(value: unknown): MaterialMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as MaterialMetadata;
}

function readMetadataString(metadata: MaterialMetadata, keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return null;
}

function resolveTextField(
  explicitValue: string | undefined,
  metadata: MaterialMetadata,
  keys: string[],
  fallback?: string | null
) {
  const trimmed = explicitValue?.trim();
  if (trimmed) {
    return trimmed;
  }

  const metadataValue = readMetadataString(metadata, keys);
  if (metadataValue) {
    return metadataValue;
  }

  return fallback ?? null;
}

function parseThickness(value?: string) {
  if (!value) {
    return null;
  }

  const numeric = Number(value.replace(/[^0-9.,]/g, '').replace(',', '.'));
  return Number.isFinite(numeric) ? numeric : null;
}

function parseOptionalNumber(value: number | string | null | undefined) {
  if (value == null || value === '') {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function computeDefaultUnitsPerPallet(defaultUnitsPerPackage: number | null, packagesPerPallet: number | null) {
  if (defaultUnitsPerPackage == null || packagesPerPallet == null) {
    return null;
  }

  return Number((defaultUnitsPerPackage * packagesPerPallet).toFixed(4));
}

function resolvePackagingForCreate(dto: CreateMaterialDto): MaterialPackaging {
  const stockUnit = dto.stockUnit?.trim() || dto.unit;
  const packageUnit = dto.packageUnit?.trim() || null;
  const defaultUnitsPerPackage = parseOptionalNumber(dto.defaultUnitsPerPackage);
  const palletUnit = dto.palletUnit?.trim() || 'palet';
  const packagesPerPallet = parseOptionalNumber(dto.packagesPerPallet);
  const defaultUnitsPerPallet = computeDefaultUnitsPerPallet(defaultUnitsPerPackage, packagesPerPallet);

  return {
    stockUnit,
    packageUnit,
    defaultUnitsPerPackage,
    palletUnit,
    packagesPerPallet,
    defaultUnitsPerPallet: defaultUnitsPerPallet ?? parseOptionalNumber(dto.defaultUnitsPerPallet)
  };
}

function resolvePackagingForUpdate(existing: Material, dto: UpdateMaterialDto): MaterialPackaging {
  const stockUnit = dto.stockUnit?.trim() || existing.stockUnit || dto.unit || existing.unit;
  const packageUnit = dto.packageUnit === undefined ? existing.packageUnit ?? null : dto.packageUnit?.trim() || null;
  const defaultUnitsPerPackage =
    dto.defaultUnitsPerPackage === undefined ? (existing.defaultUnitsPerPackage == null ? null : toNumber(existing.defaultUnitsPerPackage)) : parseOptionalNumber(dto.defaultUnitsPerPackage);
  const palletUnit = dto.palletUnit === undefined ? existing.palletUnit ?? 'palet' : dto.palletUnit?.trim() || null;
  const packagesPerPallet =
    dto.packagesPerPallet === undefined ? (existing.packagesPerPallet == null ? null : toNumber(existing.packagesPerPallet)) : parseOptionalNumber(dto.packagesPerPallet);
  const defaultUnitsPerPallet =
    computeDefaultUnitsPerPallet(defaultUnitsPerPackage, packagesPerPallet) ??
    (dto.defaultUnitsPerPallet === undefined
      ? existing.defaultUnitsPerPallet == null
        ? null
        : toNumber(existing.defaultUnitsPerPallet)
      : parseOptionalNumber(dto.defaultUnitsPerPallet));

  return {
    stockUnit,
    packageUnit,
    defaultUnitsPerPackage,
    palletUnit,
    packagesPerPallet,
    defaultUnitsPerPallet
  };
}

function mapCategory(category: MaterialCategory | null | undefined) {
  if (!category) {
    return {
      categoryCode: MATERIAL_CATEGORIES[0].code,
      categoryLabel: MATERIAL_CATEGORIES[0].label
    };
  }

  return {
    categoryCode: category.code as MaterialCategoryCode,
    categoryLabel: category.name
  };
}

function mapMaterial(material: Material & { category?: MaterialCategory | null }) {
  const category = mapCategory(material.category);
  const metadata = parseMetadata(material.metadata);
  const defaultUnitsPerPackage = material.defaultUnitsPerPackage == null ? null : toNumber(material.defaultUnitsPerPackage);
  const packagesPerPallet = material.packagesPerPallet == null ? null : toNumber(material.packagesPerPallet);
  const defaultUnitsPerPallet =
    material.defaultUnitsPerPallet == null ? computeDefaultUnitsPerPallet(defaultUnitsPerPackage, packagesPerPallet) : toNumber(material.defaultUnitsPerPallet);

  return {
    id: material.id,
    materialNo: material.materialNo,
    categoryCode: category.categoryCode,
    categoryLabel: category.categoryLabel,
    name: material.name,
    materialType: readMetadataString(metadata, ['materialType', 'Növ', 'Tip']) ?? material.category?.name ?? null,
    gramThickness: readMetadataString(metadata, ['gramThickness', 'Qram', 'Qalınlıq']) ?? (material.gram != null ? `${toNumber(material.gram)} qr` : null),
    formatSize: readMetadataString(metadata, ['formatSize', 'Ölçü', 'Ölçü / ölçü']) ?? material.size ?? null,
    stockUnit: material.stockUnit,
    packageUnit: material.packageUnit,
    defaultUnitsPerPackage,
    palletUnit: material.palletUnit ?? 'palet',
    packagesPerPallet,
    defaultUnitsPerPallet,
    unit: material.unit,
    currencyCode: (typeof metadata.currencyCode === 'string' ? metadata.currencyCode : undefined) ?? 'AZN',
    purchasePrice: typeof metadata.purchasePrice === 'number' ? metadata.purchasePrice : toNumber(material.unitCost),
    aznPrice: typeof metadata.aznPrice === 'number' ? metadata.aznPrice : toNumber(material.costPrice),
    isActive: material.isActive,
    notes: material.notes,
    metadata,
    createdAt: material.createdAt.toISOString(),
    updatedAt: material.updatedAt.toISOString()
  };
}

@Injectable()
export class MaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: MaterialListQueryDto) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const skip = (page - 1) * limit;

    const where: Prisma.MaterialWhereInput = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { sku: { contains: query.search, mode: 'insensitive' } },
              { size: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {}),
      ...(query.categoryCode ? { category: { code: query.categoryCode } } : {}),
      ...(query.status === 'active'
        ? { isActive: true }
        : query.status === 'inactive'
          ? { isActive: false }
          : {})
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.material.count({ where }),
      this.prisma.material.findMany({
        where,
        include: { category: true },
        orderBy: [{ createdAt: 'desc' }, { sku: 'desc' }],
        skip,
        take: limit
      })
    ]);

    return {
      data: rows.map(mapMaterial),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    };
  }

  async getById(id: string) {
    const material = await this.prisma.material.findFirst({
      where: { id, deletedAt: null },
      include: { category: true }
    });

    if (!material) {
      throw new NotFoundException('Material tapılmadı');
    }

    return mapMaterial(material);
  }

  async create(dto: CreateMaterialDto) {
    const category = await this.prisma.materialCategory.findUnique({
      where: { code: dto.categoryCode }
    });

    if (!category) {
      throw new BadRequestException('Seçilmiş kateqoriya tapılmadı');
    }

    const material = await this.prisma.$transaction(async (tx) => {
      const sequence = await tx.numberSequence.upsert({
        where: { key: 'material' },
        update: {},
        create: {
          key: 'material',
          prefix: 'MAT-',
          currentValue: 0,
          step: 1,
          padding: 6
        }
      });

      const nextValue = sequence.currentValue + sequence.step;
      await tx.numberSequence.update({
        where: { key: 'material' },
        data: { currentValue: nextValue }
      });

      const materialNo = `${sequence.prefix}${String(nextValue).padStart(sequence.padding, '0')}`;
      const parsedThickness = parseThickness(dto.gramThickness);
      const purchasePrice = dto.purchasePrice ?? 0;
      const aznPrice = dto.aznPrice ?? dto.purchasePrice ?? 0;
      const packaging = resolvePackagingForCreate(dto);
      const incomingMetadata = parseMetadata(dto.metadata);
      const materialType = resolveTextField(dto.materialType, incomingMetadata, ['materialType', 'Tip', 'Növ'], category.name);
      const gramThickness = resolveTextField(dto.gramThickness, incomingMetadata, ['gramThickness', 'Qram', 'Qalınlıq']);
      const formatSize = resolveTextField(dto.formatSize, incomingMetadata, ['formatSize', 'Ölçü']);

      return tx.material.create({
        data: {
          materialNo,
          sku: materialNo,
          category: { connect: { id: category.id } },
          name: dto.name.trim(),
          unit: dto.unit,
          stockUnit: packaging.stockUnit,
          packageUnit: packaging.packageUnit,
          defaultUnitsPerPackage: packaging.defaultUnitsPerPackage ?? undefined,
          palletUnit: packaging.palletUnit,
          packagesPerPallet: packaging.packagesPerPallet ?? undefined,
          defaultUnitsPerPallet: packaging.defaultUnitsPerPallet ?? undefined,
          gram: parsedThickness,
          size: dto.formatSize?.trim() || null,
          unitCost: purchasePrice,
          costPrice: aznPrice,
          isActive: dto.isActive ?? true,
          notes: dto.notes?.trim() || null,
          metadata: {
            ...incomingMetadata,
            materialType,
            gramThickness,
            formatSize,
            currencyCode: dto.currencyCode?.trim() || 'AZN',
            purchasePrice,
            aznPrice
          }
        },
        include: { category: true }
      });
    });

    return mapMaterial(material);
  }

  async update(id: string, dto: UpdateMaterialDto) {
    const existing = await this.prisma.material.findFirst({
      where: { id, deletedAt: null },
      include: { category: true }
    });

    if (!existing) {
      throw new NotFoundException('Material tapılmadı');
    }

    let categoryId = existing.categoryId;
    if (dto.categoryCode) {
      const category = await this.prisma.materialCategory.findUnique({
        where: { code: dto.categoryCode }
      });

      if (!category) {
        throw new BadRequestException('Seçilmiş kateqoriya tapılmadı');
      }

      categoryId = category.id;
    }

    const existingMetadata = parseMetadata(existing.metadata);
    const parsedThickness = dto.gramThickness === undefined ? existing.gram : parseThickness(dto.gramThickness);
    const purchasePrice =
      dto.purchasePrice ?? (typeof existingMetadata.purchasePrice === 'number' ? existingMetadata.purchasePrice : toNumber(existing.unitCost));
    const aznPrice = dto.aznPrice ?? (typeof existingMetadata.aznPrice === 'number' ? existingMetadata.aznPrice : toNumber(existing.costPrice));
    const packaging = resolvePackagingForUpdate(existing, dto);
    const nextMetadata = parseMetadata(dto.metadata);
    const materialType = resolveTextField(dto.materialType, { ...existingMetadata, ...nextMetadata }, ['materialType', 'Tip', 'Növ'], existing.category?.name);
    const gramThickness = resolveTextField(dto.gramThickness, { ...existingMetadata, ...nextMetadata }, ['gramThickness', 'Qram', 'Qalınlıq'], existingMetadata.gramThickness ?? null);
    const formatSize = resolveTextField(dto.formatSize, { ...existingMetadata, ...nextMetadata }, ['formatSize', 'Ölçü'], existingMetadata.formatSize ?? existing.size ?? null);

    const updated = await this.prisma.material.update({
      where: { id },
      data: {
        category: categoryId ? { connect: { id: categoryId } } : undefined,
        name: dto.name?.trim() ?? existing.name,
        unit: dto.unit ?? existing.unit,
        stockUnit: packaging.stockUnit,
        packageUnit: packaging.packageUnit,
        defaultUnitsPerPackage: packaging.defaultUnitsPerPackage ?? undefined,
        palletUnit: packaging.palletUnit,
        packagesPerPallet: packaging.packagesPerPallet ?? undefined,
        defaultUnitsPerPallet: packaging.defaultUnitsPerPallet ?? undefined,
        gram: parsedThickness,
        size: dto.formatSize === undefined ? existing.size : dto.formatSize?.trim() || null,
        unitCost: purchasePrice,
        costPrice: aznPrice,
        isActive: dto.isActive ?? existing.isActive,
        notes: dto.notes === undefined ? existing.notes : dto.notes?.trim() || null,
        metadata: {
          ...existingMetadata,
          ...nextMetadata,
          materialType,
          gramThickness,
          formatSize,
          currencyCode: dto.currencyCode?.trim() ?? existingMetadata.currencyCode ?? 'AZN',
          purchasePrice,
          aznPrice
        }
      },
      include: { category: true }
    });

    return mapMaterial(updated);
  }

  async remove(id: string) {
    const existing = await this.prisma.material.findFirst({
      where: { id, deletedAt: null }
    });

    if (!existing) {
      throw new NotFoundException('Material tapılmadı');
    }

    const removed = await this.prisma.material.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false
      },
      include: { category: true }
    });

    return mapMaterial(removed);
  }
}
