import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buildPaginatedResponse, normalizePagination } from '../../common/query/pagination';
import {
  CalculationSettingsListQueryDto,
  CreateCalculationFormPriceRuleDto,
  CreateCalculationLaminationPriceRuleDto,
  CreateCalculationPrintPriceRuleDto,
  CreateCalculationServicePriceRuleDto,
  UpdateCalculationFormPriceRuleDto,
  UpdateCalculationLaminationPriceRuleDto,
  UpdateCalculationPrintPriceRuleDto,
  UpdateCalculationServicePriceRuleDto
} from './dto/calculation-setting.dto';

type RuleRow = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  isActive: boolean;
  note: string | null;
};

type PrintPriceRow = RuleRow & {
  minQuantity: Prisma.Decimal | number | string;
  maxQuantity: Prisma.Decimal | number | string;
  colorMode: string;
  price: Prisma.Decimal | number | string;
};

type LaminationPriceRow = RuleRow & {
  laminationType: string;
  sideMode: string;
  unitPrice: Prisma.Decimal | number | string;
};

type FormPriceRow = RuleRow & {
  name: string;
  unit: string;
  unitPrice: Prisma.Decimal | number | string;
};

type ServicePriceRow = RuleRow & {
  serviceType: string;
  name: string;
  unit: string;
  unitPrice: Prisma.Decimal | number | string;
  allowDiscount: boolean;
};

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value == null) return 0;
  return Number(value.toString());
}

function toText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function parseBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function buildWhere(query: CalculationSettingsListQueryDto, searchableColumns: string[]) {
  const conditions: Prisma.Sql[] = [Prisma.sql`"deletedAt" IS NULL`];
  if (typeof query.isActive === 'boolean') {
    conditions.push(Prisma.sql`"isActive" = ${query.isActive}`);
  }

  const search = query.search?.trim();
  if (search) {
    const like = `%${search.toLowerCase()}%`;
    const searchParts = searchableColumns.map((column) => Prisma.sql`LOWER(${Prisma.raw(`"${column}"`)}) LIKE ${like}`);
    conditions.push(Prisma.sql`(${Prisma.join(searchParts, ' OR ')})`);
  }

  return conditions.length ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}` : Prisma.sql``;
}

function normalizeJsonValue(value: unknown): unknown[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') {
          const candidate = item as { label?: unknown; value?: unknown };
          const label = typeof candidate.label === 'string' ? candidate.label.trim() : '';
          const innerValue = typeof candidate.value === 'string' ? candidate.value.trim() : '';
          return innerValue || label ? { label: label || innerValue, value: innerValue || label } : null;
        }
        return null;
      })
      .filter(Boolean) as unknown[];
  }
  return [];
}

function serializePrint(row: PrintPriceRow) {
  return {
    id: row.id,
    minQuantity: toNumber(row.minQuantity),
    maxQuantity: toNumber(row.maxQuantity),
    colorMode: row.colorMode,
    price: toNumber(row.price),
    isActive: row.isActive,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function serializeLamination(row: LaminationPriceRow) {
  return {
    id: row.id,
    laminationType: row.laminationType,
    sideMode: row.sideMode,
    unitPrice: toNumber(row.unitPrice),
    isActive: row.isActive,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function serializeForm(row: FormPriceRow) {
  return {
    id: row.id,
    name: row.name,
    unit: row.unit,
    unitPrice: toNumber(row.unitPrice),
    isActive: row.isActive,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function serializeService(row: ServicePriceRow) {
  return {
    id: row.id,
    serviceType: row.serviceType,
    name: row.name,
    unit: row.unit,
    unitPrice: toNumber(row.unitPrice),
    allowDiscount: row.allowDiscount,
    isActive: row.isActive,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

@Injectable()
export class CalculationSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private async listTable<T>(
    table: string,
    query: CalculationSettingsListQueryDto,
    searchableColumns: string[],
    selectSql: Prisma.Sql,
    serialize: (row: any) => T
  ) {
    const { page, limit, skip, take } = normalizePagination(query);
    const where = buildWhere(query, searchableColumns);
    const [totalRows, rows] = await Promise.all([
      this.prisma.$queryRaw<{ count: number }[]>(Prisma.sql`SELECT COUNT(*)::int AS count FROM ${Prisma.raw(table)} ${where}`),
      this.prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT ${selectSql}
        FROM ${Prisma.raw(table)}
        ${where}
        ORDER BY "createdAt" DESC
        LIMIT ${take}
        OFFSET ${skip}
      `)
    ]);

    return buildPaginatedResponse(rows.map(serialize), totalRows[0]?.count ?? 0, page, limit);
  }

  private async getOne<T>(table: string, id: string, selectSql: Prisma.Sql, serialize: (row: any) => T) {
    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT ${selectSql}
      FROM ${Prisma.raw(table)}
      WHERE id = ${id} AND "deletedAt" IS NULL
      LIMIT 1
    `);

    const row = rows[0];
    if (!row) {
      throw new NotFoundException('Tapılmadı');
    }

    return serialize(row);
  }

  private async createOne<T>(table: string, columns: Prisma.Sql, values: Prisma.Sql, selectSql: Prisma.Sql, serialize: (row: any) => T) {
    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO ${Prisma.raw(table)} (${columns})
      VALUES (${values})
      RETURNING ${selectSql}
    `);

    const row = rows[0];
    if (!row) {
      throw new BadRequestException('Yaradılmadı');
    }
    return serialize(row);
  }

  async findPrintPrices(query: CalculationSettingsListQueryDto) {
    return this.listTable<ReturnType<typeof serializePrint>>(
      'calculation_print_price_rules',
      query,
      ['colorMode', 'note'],
      Prisma.sql`id, "minQuantity", "maxQuantity", "colorMode", price, "isActive", note, "createdAt", "updatedAt"`,
      serializePrint
    );
  }

  async getPrintPrice(id: string) {
    return this.getOne('calculation_print_price_rules', id, Prisma.sql`id, "minQuantity", "maxQuantity", "colorMode", price, "isActive", note, "createdAt", "updatedAt"`, serializePrint);
  }

  async createPrintPrice(dto: CreateCalculationPrintPriceRuleDto) {
    return this.createOne(
      'calculation_print_price_rules',
      Prisma.sql`id, "minQuantity", "maxQuantity", "colorMode", price, "isActive", note, "createdAt", "updatedAt", "deletedAt"`,
      Prisma.sql`gen_random_uuid(), ${dto.minQuantity}, ${dto.maxQuantity}, ${dto.colorMode}, ${dto.price}, ${dto.isActive ?? true}, ${dto.note ?? null}, NOW(), NOW(), NULL`,
      Prisma.sql`id, "minQuantity", "maxQuantity", "colorMode", price, "isActive", note, "createdAt", "updatedAt"`,
      serializePrint
    );
  }

  async updatePrintPrice(id: string, dto: UpdateCalculationPrintPriceRuleDto) {
    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      UPDATE calculation_print_price_rules
      SET "minQuantity" = COALESCE(${dto.minQuantity}, "minQuantity"),
          "maxQuantity" = COALESCE(${dto.maxQuantity}, "maxQuantity"),
          "colorMode" = COALESCE(${dto.colorMode}, "colorMode"),
          price = COALESCE(${dto.price}, price),
          "isActive" = COALESCE(${dto.isActive}, "isActive"),
          note = COALESCE(${dto.note ?? null}, note),
          "updatedAt" = NOW()
      WHERE id = ${id} AND "deletedAt" IS NULL
      RETURNING id, "minQuantity", "maxQuantity", "colorMode", price, "isActive", note, "createdAt", "updatedAt"
    `);
    const row = rows[0];
    if (!row) throw new NotFoundException('Tapılmadı');
    return serializePrint(row);
  }

  async removePrintPrice(id: string) {
    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      UPDATE calculation_print_price_rules
      SET "isActive" = false, "deletedAt" = NOW(), "updatedAt" = NOW()
      WHERE id = ${id} AND "deletedAt" IS NULL
      RETURNING id, "minQuantity", "maxQuantity", "colorMode", price, "isActive", note, "createdAt", "updatedAt"
    `);
    const row = rows[0];
    if (!row) throw new NotFoundException('Tapılmadı');
    return serializePrint(row);
  }

  async findLaminationPrices(query: CalculationSettingsListQueryDto) {
    return this.listTable<ReturnType<typeof serializeLamination>>(
      'calculation_lamination_price_rules',
      query,
      ['laminationType', 'sideMode', 'note'],
      Prisma.sql`id, "laminationType", "sideMode", "unitPrice", "isActive", note, "createdAt", "updatedAt"`,
      serializeLamination
    );
  }

  async getLaminationPrice(id: string) {
    return this.getOne('calculation_lamination_price_rules', id, Prisma.sql`id, "laminationType", "sideMode", "unitPrice", "isActive", note, "createdAt", "updatedAt"`, serializeLamination);
  }

  async createLaminationPrice(dto: CreateCalculationLaminationPriceRuleDto) {
    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO calculation_lamination_price_rules (id, "laminationType", "sideMode", "unitPrice", "isActive", note, "createdAt", "updatedAt", "deletedAt")
      VALUES (gen_random_uuid(), ${dto.laminationType}, ${dto.sideMode}, ${dto.unitPrice}, ${dto.isActive ?? true}, ${dto.note ?? null}, NOW(), NOW(), NULL)
      RETURNING id, "laminationType", "sideMode", "unitPrice", "isActive", note, "createdAt", "updatedAt"
    `);
    const row = rows[0];
    if (!row) throw new BadRequestException('Yaradılmadı');
    return serializeLamination(row);
  }

  async updateLaminationPrice(id: string, dto: UpdateCalculationLaminationPriceRuleDto) {
    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      UPDATE calculation_lamination_price_rules
      SET "laminationType" = COALESCE(${dto.laminationType}, "laminationType"),
          "sideMode" = COALESCE(${dto.sideMode}, "sideMode"),
          "unitPrice" = COALESCE(${dto.unitPrice}, "unitPrice"),
          "isActive" = COALESCE(${dto.isActive}, "isActive"),
          note = COALESCE(${dto.note ?? null}, note),
          "updatedAt" = NOW()
      WHERE id = ${id} AND "deletedAt" IS NULL
      RETURNING id, "laminationType", "sideMode", "unitPrice", "isActive", note, "createdAt", "updatedAt"
    `);
    const row = rows[0];
    if (!row) throw new NotFoundException('Tapılmadı');
    return serializeLamination(row);
  }

  async removeLaminationPrice(id: string) {
    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      UPDATE calculation_lamination_price_rules
      SET "isActive" = false, "deletedAt" = NOW(), "updatedAt" = NOW()
      WHERE id = ${id} AND "deletedAt" IS NULL
      RETURNING id, "laminationType", "sideMode", "unitPrice", "isActive", note, "createdAt", "updatedAt"
    `);
    const row = rows[0];
    if (!row) throw new NotFoundException('Tapılmadı');
    return serializeLamination(row);
  }

  async findFormPrices(query: CalculationSettingsListQueryDto) {
    return this.listTable<ReturnType<typeof serializeForm>>(
      'calculation_form_price_rules',
      query,
      ['name', 'unit', 'note'],
      Prisma.sql`id, name, unit, "unitPrice", "isActive", note, "createdAt", "updatedAt"`,
      serializeForm
    );
  }

  async getFormPrice(id: string) {
    return this.getOne('calculation_form_price_rules', id, Prisma.sql`id, name, unit, "unitPrice", "isActive", note, "createdAt", "updatedAt"`, serializeForm);
  }

  async createFormPrice(dto: CreateCalculationFormPriceRuleDto) {
    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO calculation_form_price_rules (id, name, unit, "unitPrice", "isActive", note, "createdAt", "updatedAt", "deletedAt")
      VALUES (gen_random_uuid(), ${dto.name}, ${dto.unit}, ${dto.unitPrice}, ${dto.isActive ?? true}, ${dto.note ?? null}, NOW(), NOW(), NULL)
      RETURNING id, name, unit, "unitPrice", "isActive", note, "createdAt", "updatedAt"
    `);
    const row = rows[0];
    if (!row) throw new BadRequestException('Yaradılmadı');
    return serializeForm(row);
  }

  async updateFormPrice(id: string, dto: UpdateCalculationFormPriceRuleDto) {
    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      UPDATE calculation_form_price_rules
      SET name = COALESCE(${dto.name}, name),
          unit = COALESCE(${dto.unit}, unit),
          "unitPrice" = COALESCE(${dto.unitPrice}, "unitPrice"),
          "isActive" = COALESCE(${dto.isActive}, "isActive"),
          note = COALESCE(${dto.note ?? null}, note),
          "updatedAt" = NOW()
      WHERE id = ${id} AND "deletedAt" IS NULL
      RETURNING id, name, unit, "unitPrice", "isActive", note, "createdAt", "updatedAt"
    `);
    const row = rows[0];
    if (!row) throw new NotFoundException('Tapılmadı');
    return serializeForm(row);
  }

  async removeFormPrice(id: string) {
    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      UPDATE calculation_form_price_rules
      SET "isActive" = false, "deletedAt" = NOW(), "updatedAt" = NOW()
      WHERE id = ${id} AND "deletedAt" IS NULL
      RETURNING id, name, unit, "unitPrice", "isActive", note, "createdAt", "updatedAt"
    `);
    const row = rows[0];
    if (!row) throw new NotFoundException('Tapılmadı');
    return serializeForm(row);
  }

  async findServicePrices(query: CalculationSettingsListQueryDto) {
    return this.listTable<ReturnType<typeof serializeService>>(
      'calculation_service_price_rules',
      query,
      ['serviceType', 'name', 'unit', 'note'],
      Prisma.sql`id, "serviceType", name, unit, "unitPrice", "allowDiscount", "isActive", note, "createdAt", "updatedAt"`,
      serializeService
    );
  }

  async getServicePrice(id: string) {
    return this.getOne('calculation_service_price_rules', id, Prisma.sql`id, "serviceType", name, unit, "unitPrice", "allowDiscount", "isActive", note, "createdAt", "updatedAt"`, serializeService);
  }

  async createServicePrice(dto: CreateCalculationServicePriceRuleDto) {
    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO calculation_service_price_rules (id, "serviceType", name, unit, "unitPrice", "allowDiscount", "isActive", note, "createdAt", "updatedAt", "deletedAt")
      VALUES (gen_random_uuid(), ${dto.serviceType}, ${dto.name}, ${dto.unit}, ${dto.unitPrice}, ${dto.allowDiscount ?? false}, ${dto.isActive ?? true}, ${dto.note ?? null}, NOW(), NOW(), NULL)
      RETURNING id, "serviceType", name, unit, "unitPrice", "allowDiscount", "isActive", note, "createdAt", "updatedAt"
    `);
    const row = rows[0];
    if (!row) throw new BadRequestException('Yaradılmadı');
    return serializeService(row);
  }

  async updateServicePrice(id: string, dto: UpdateCalculationServicePriceRuleDto) {
    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      UPDATE calculation_service_price_rules
      SET "serviceType" = COALESCE(${dto.serviceType}, "serviceType"),
          name = COALESCE(${dto.name}, name),
          unit = COALESCE(${dto.unit}, unit),
          "unitPrice" = COALESCE(${dto.unitPrice}, "unitPrice"),
          "allowDiscount" = COALESCE(${dto.allowDiscount}, "allowDiscount"),
          "isActive" = COALESCE(${dto.isActive}, "isActive"),
          note = COALESCE(${dto.note ?? null}, note),
          "updatedAt" = NOW()
      WHERE id = ${id} AND "deletedAt" IS NULL
      RETURNING id, "serviceType", name, unit, "unitPrice", "allowDiscount", "isActive", note, "createdAt", "updatedAt"
    `);
    const row = rows[0];
    if (!row) throw new NotFoundException('Tapılmadı');
    return serializeService(row);
  }

  async removeServicePrice(id: string) {
    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      UPDATE calculation_service_price_rules
      SET "isActive" = false, "deletedAt" = NOW(), "updatedAt" = NOW()
      WHERE id = ${id} AND "deletedAt" IS NULL
      RETURNING id, "serviceType", name, unit, "unitPrice", "allowDiscount", "isActive", note, "createdAt", "updatedAt"
    `);
    const row = rows[0];
    if (!row) throw new NotFoundException('Tapılmadı');
    return serializeService(row);
  }
}
