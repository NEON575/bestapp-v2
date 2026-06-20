import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buildPaginatedResponse, normalizePagination } from '../../common/query/pagination';
import {
  calculationParameterCategoryLabel,
  type CalculationParameterCategory,
  type CalculationParameterItem,
  type CalculationParameterVariantItem
} from '../../common/business/calculation-flow';
import {
  CalculationParameterListQueryDto,
  CreateCalculationParameterDto,
  UpdateCalculationParameterDto
} from './dto/calculation-parameter.dto';

type CalculationParameterRow = {
  id: string;
  category: string;
  name: string;
  variants: Prisma.JsonValue | null;
  unit: string;
  price: Prisma.Decimal | number | string;
  isActive: boolean;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value == null) return 0;
  return typeof value === 'number' ? value : Number(value.toString());
}

function toText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function normalizeVariantText(input?: string[] | CalculationParameterVariantItem[] | Prisma.JsonValue | null) {
  if (!input || !Array.isArray(input)) {
    return [] as CalculationParameterVariantItem[];
  }

  return input
    .map((item) => {
      if (typeof item === 'string') {
        const value = toText(item);
        return value ? { label: value, value } : null;
      }

      if (item && typeof item === 'object') {
        const candidate = item as Partial<CalculationParameterVariantItem>;
        const label = toText(candidate.label);
        const value = toText(candidate.value, label);
        return label || value ? { label: label || value, value: value || label } : null;
      }

      return null;
    })
    .filter(Boolean) as CalculationParameterVariantItem[];
}

function serialize(parameter: CalculationParameterRow | null): CalculationParameterItem | null {
  if (!parameter) {
    return null;
  }

  return {
    id: parameter.id,
    category: parameter.category as CalculationParameterCategory,
    name: parameter.name,
    variants: normalizeVariantText(parameter.variants),
    unit: parameter.unit,
    price: toNumber(parameter.price),
    isActive: parameter.isActive,
    note: parameter.note,
    createdAt: parameter.createdAt.toISOString(),
    updatedAt: parameter.updatedAt.toISOString()
  };
}

function buildWhere(query: CalculationParameterListQueryDto) {
  const conditions: Prisma.Sql[] = [Prisma.sql`"deletedAt" IS NULL`];
  const search = query.search?.trim();

  if (query.category) {
    conditions.push(Prisma.sql`"category" = ${query.category}`);
  }

  const isActive =
    query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined;

  if (typeof isActive === 'boolean') {
    conditions.push(Prisma.sql`"isActive" = ${isActive}`);
  }

  if (search) {
    const like = `%${search.toLowerCase()}%`;
    conditions.push(
      Prisma.sql`(LOWER("name") LIKE ${like} OR LOWER("unit") LIKE ${like} OR LOWER(COALESCE("note", '')) LIKE ${like})`
    );
  }

  return conditions.length
    ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
    : Prisma.sql``;
}

@Injectable()
export class CalculationParametersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService
  ) {}

  async findAll(query: CalculationParameterListQueryDto) {
    const { page, limit, skip, take } = normalizePagination(query);
    const where = buildWhere(query);

    const [totalRows, rows] = await Promise.all([
      this.prisma.$queryRaw<{ count: number }[]>(Prisma.sql`SELECT COUNT(*)::int AS count FROM calculation_parameters ${where}`),
      this.prisma.$queryRaw<CalculationParameterRow[]>(Prisma.sql`
        SELECT id, category, name, variants, unit, price, "isActive", note, "createdAt", "updatedAt"
        FROM calculation_parameters
        ${where}
        ORDER BY category ASC, name ASC
        LIMIT ${take}
        OFFSET ${skip}
      `)
    ]);

    return buildPaginatedResponse(
      rows.map((parameter) => serialize(parameter)!),
      totalRows[0]?.count ?? 0,
      page,
      limit
    );
  }

  async findOne(id: string) {
    const rows = await this.prisma.$queryRaw<CalculationParameterRow[]>(Prisma.sql`
      SELECT id, category, name, variants, unit, price, "isActive", note, "createdAt", "updatedAt"
      FROM calculation_parameters
      WHERE id = ${id} AND "deletedAt" IS NULL
      LIMIT 1
    `);

    const parameter = rows[0] ?? null;
    if (!parameter) {
      throw new NotFoundException('Calculation parameter not found');
    }

    return serialize(parameter);
  }

  async create(dto: CreateCalculationParameterDto) {
    const rows = await this.prisma.$queryRaw<CalculationParameterRow[]>(Prisma.sql`
      INSERT INTO calculation_parameters (id, category, name, variants, unit, price, "isActive", note, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${dto.category}, ${toText(dto.name)}, ${JSON.stringify(normalizeVariantText(dto.variants ?? []).map((variant) => variant.value))}::jsonb, ${toText(dto.unit)}, ${dto.price}, ${dto.isActive ?? true}, ${dto.note || null}, NOW(), NOW())
      RETURNING id, category, name, variants, unit, price, "isActive", note, "createdAt", "updatedAt"
    `);

    const created = rows[0];
    if (!created) {
      throw new Error('Failed to create calculation parameter');
    }

    await this.auditService.log({
      action: 'calculation_parameter.created',
      entityType: 'calculation_parameter',
      entityId: created.id,
      afterData: created,
      metadata: {
        category: created.category,
        categoryLabel: calculationParameterCategoryLabel(created.category as CalculationParameterCategory)
      }
    });

    return serialize(created)!;
  }

  async update(id: string, dto: UpdateCalculationParameterDto) {
    const existingRows = await this.prisma.$queryRaw<CalculationParameterRow[]>(Prisma.sql`
      SELECT id, category, name, variants, unit, price, "isActive", note, "createdAt", "updatedAt"
      FROM calculation_parameters
      WHERE id = ${id} AND "deletedAt" IS NULL
      LIMIT 1
    `);

    const existing = existingRows[0] ?? null;
    if (!existing) {
      throw new NotFoundException('Calculation parameter not found');
    }

    const variants = dto.variants != null ? normalizeVariantText(dto.variants).map((variant) => variant.value) : normalizeVariantText(existing.variants).map((variant) => variant.value);
    const updatedRows = await this.prisma.$queryRaw<CalculationParameterRow[]>(Prisma.sql`
      UPDATE calculation_parameters
      SET category = ${dto.category ?? existing.category},
          name = ${dto.name != null ? toText(dto.name) : existing.name},
          variants = ${JSON.stringify(variants)}::jsonb,
          unit = ${dto.unit != null ? toText(dto.unit) : existing.unit},
          price = ${dto.price != null ? dto.price : toNumber(existing.price)},
          "isActive" = ${dto.isActive ?? existing.isActive},
          note = ${dto.note != null ? dto.note || null : existing.note},
          "updatedAt" = NOW()
      WHERE id = ${id}
      RETURNING id, category, name, variants, unit, price, "isActive", note, "createdAt", "updatedAt"
    `);

    const updated = updatedRows[0];
    if (!updated) {
      throw new Error('Failed to update calculation parameter');
    }

    await this.auditService.log({
      action: 'calculation_parameter.updated',
      entityType: 'calculation_parameter',
      entityId: updated.id,
      beforeData: existing,
      afterData: updated
    });

    return serialize(updated)!;
  }

  async remove(id: string) {
    const existingRows = await this.prisma.$queryRaw<CalculationParameterRow[]>(Prisma.sql`
      SELECT id, category, name, variants, unit, price, "isActive", note, "createdAt", "updatedAt"
      FROM calculation_parameters
      WHERE id = ${id} AND "deletedAt" IS NULL
      LIMIT 1
    `);

    const existing = existingRows[0] ?? null;
    if (!existing) {
      throw new NotFoundException('Calculation parameter not found');
    }

    const updatedRows = await this.prisma.$queryRaw<CalculationParameterRow[]>(Prisma.sql`
      UPDATE calculation_parameters
      SET "isActive" = false,
          "deletedAt" = NOW(),
          "updatedAt" = NOW()
      WHERE id = ${id}
      RETURNING id, category, name, variants, unit, price, "isActive", note, "createdAt", "updatedAt"
    `);

    const updated = updatedRows[0];
    if (!updated) {
      throw new Error('Failed to remove calculation parameter');
    }

    await this.auditService.log({
      action: 'calculation_parameter.deleted',
      entityType: 'calculation_parameter',
      entityId: updated.id,
      beforeData: existing,
      afterData: updated
    });

    return serialize(updated)!;
  }
}
