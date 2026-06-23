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
};

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value == null) {
    return 0;
  }

  return Number(value.toString());
}

function parseMetadata(value: Prisma.JsonValue | null | undefined): MaterialMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as MaterialMetadata;
}

function parseThickness(value?: string) {
  if (!value) {
    return null;
  }

  const numeric = Number(value.replace(/[^0-9.,]/g, '').replace(',', '.'));
  return Number.isFinite(numeric) ? numeric : null;
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

  return {
    id: material.id,
    materialNo: material.sku ?? material.id,
    categoryCode: category.categoryCode,
    categoryLabel: category.categoryLabel,
    name: material.name,
    materialType: metadata.materialType ?? material.category?.name ?? null,
    gramThickness: metadata.gramThickness ?? (material.gram != null ? `${toNumber(material.gram)} qr` : null),
    formatSize: metadata.formatSize ?? material.size ?? null,
    unit: material.unit,
    currencyCode: metadata.currencyCode ?? 'AZN',
    purchasePrice: metadata.purchasePrice ?? toNumber(material.unitCost),
    aznPrice: metadata.aznPrice ?? toNumber(material.costPrice),
    isActive: material.isActive,
    notes: material.notes,
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

      return tx.material.create({
        data: {
          sku: materialNo,
          categoryId: category.id,
          name: dto.name.trim(),
          unit: dto.unit,
          gram: parsedThickness,
          size: dto.formatSize?.trim() || null,
          unitCost: purchasePrice,
          costPrice: aznPrice,
          isActive: dto.isActive ?? true,
          notes: dto.notes?.trim() || null,
          metadata: {
            materialType: dto.materialType?.trim() || category.name,
            gramThickness: dto.gramThickness?.trim() || null,
            formatSize: dto.formatSize?.trim() || null,
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
    const purchasePrice = dto.purchasePrice ?? existingMetadata.purchasePrice ?? toNumber(existing.unitCost);
    const aznPrice = dto.aznPrice ?? existingMetadata.aznPrice ?? toNumber(existing.costPrice);

    const updated = await this.prisma.material.update({
      where: { id },
      data: {
        categoryId,
        name: dto.name?.trim() ?? existing.name,
        unit: dto.unit ?? existing.unit,
        gram: parsedThickness,
        size: dto.formatSize === undefined ? existing.size : dto.formatSize?.trim() || null,
        unitCost: purchasePrice,
        costPrice: aznPrice,
        isActive: dto.isActive ?? existing.isActive,
        notes: dto.notes === undefined ? existing.notes : dto.notes?.trim() || null,
        metadata: {
          ...(existingMetadata ?? {}),
          materialType: dto.materialType === undefined ? existingMetadata.materialType ?? existing.category?.name : dto.materialType?.trim() || null,
          gramThickness: dto.gramThickness === undefined ? existingMetadata.gramThickness ?? null : dto.gramThickness?.trim() || null,
          formatSize: dto.formatSize === undefined ? existingMetadata.formatSize ?? existing.size ?? null : dto.formatSize?.trim() || null,
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
