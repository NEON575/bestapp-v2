import { randomUUID } from 'crypto';
import { CalculationStatus } from '@prisma/client';

export type CalculationSectionType = 'paper' | 'printing' | 'form' | 'extra_work' | 'other_costs';

export type CalculationRowInput = Record<string, unknown> & {
  id?: string;
  name?: string;
  quantity?: number | string;
  unit?: string;
  unitPrice?: number | string;
  total?: number | string;
  note?: string;
  paperName?: string;
  format?: string;
  gramaj?: string;
  baseQuantity?: number | string;
  fire?: number | string;
  totalQuantity?: number | string;
  price?: number | string;
  printType?: string;
  printSide?: string;
  color?: string;
  printCount?: number | string;
  printPrice?: number | string;
  formCount?: number | string;
  formPrice?: number | string;
  extraWorkType?: string;
};

export type CalculationSectionInput = {
  id?: string;
  key?: CalculationSectionType;
  title?: string;
  rows?: CalculationRowInput[];
};

export type NormalizedCalculationRow = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  note: string | null;
  paperName: string | null;
  format: string | null;
  gramaj: string | null;
  baseQuantity: number | null;
  fire: number | null;
  totalQuantity: number | null;
  price: number | null;
  printType: string | null;
  printSide: string | null;
  color: string | null;
  printCount: number | null;
  printPrice: number | null;
  formCount: number | null;
  formPrice: number | null;
  extraWorkType: string | null;
};

export type NormalizedCalculationSection = {
  id: string;
  key: CalculationSectionType;
  title: string;
  total: number;
  rows: NormalizedCalculationRow[];
};

export type NormalizedCalculationPayload = {
  status: CalculationStatus;
  customerId: string;
  productName: string;
  quantity: number;
  note: string | null;
  salePrice: number;
  costPrice: number;
  profit: number;
  saleUnitPrice: number;
  sections: NormalizedCalculationSection[];
};

const DEFAULT_SECTION_TEMPLATES: Array<{ key: CalculationSectionType; title: string }> = [
  { key: 'paper', title: 'Kağız / Materiallar' },
  { key: 'printing', title: 'Çap' },
  { key: 'form', title: 'Forma' },
  { key: 'extra_work', title: 'Əlavə işlər' },
  { key: 'other_costs', title: 'Digər xərclər' }
];

const EXTRA_WORK_TYPES = ['Laminasiya', 'Kəsim', 'Beqovka', 'Qatlama', 'Termokley', 'Tikiş / Stepler', 'Deşmə', 'Əl işi', 'Qablaşdırma', 'Digər'];

function toNumber(value: number | string | null | undefined, fallback = 0) {
  if (value == null || value === '') {
    return fallback;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function buildRowName(sectionKey: CalculationSectionType, row: CalculationRowInput) {
  const candidates =
    sectionKey === 'paper'
      ? [row.paperName, row.name]
      : sectionKey === 'printing'
        ? [row.printType, row.name]
        : sectionKey === 'form'
          ? [row.name]
          : sectionKey === 'extra_work'
            ? [row.extraWorkType, row.name]
            : [row.name];

  return candidates.map((value) => normalizeText(value)).find(Boolean) || 'Sətir';
}

function normalizeRow(sectionKey: CalculationSectionType, row: CalculationRowInput): NormalizedCalculationRow {
  const baseQuantity = toNumber(row.baseQuantity ?? row.quantity, 0);
  const fire = toNumber(row.fire, 0);
  const manualTotalQuantity = row.totalQuantity != null ? toNumber(row.totalQuantity, 0) : null;
  const totalQuantity = sectionKey === 'paper' ? manualTotalQuantity ?? roundMoney(baseQuantity * (1 + fire / 100)) : null;

  const quantity =
    sectionKey === 'paper'
      ? baseQuantity
      : sectionKey === 'printing'
        ? toNumber(row.printCount ?? row.quantity, 0)
        : sectionKey === 'form'
          ? toNumber(row.formCount ?? row.quantity, 0)
          : toNumber(row.quantity, 0);

  const unitPrice =
    sectionKey === 'paper'
      ? toNumber(row.price ?? row.unitPrice, 0)
      : sectionKey === 'printing'
        ? toNumber(row.printPrice ?? row.unitPrice, 0)
        : sectionKey === 'form'
          ? toNumber(row.formPrice ?? row.unitPrice, 0)
          : toNumber(row.unitPrice, 0);

  const total =
    sectionKey === 'paper'
      ? roundMoney((totalQuantity ?? quantity) * unitPrice)
      : sectionKey === 'printing'
        ? roundMoney(toNumber(row.printCount ?? row.quantity, 0) * unitPrice)
        : sectionKey === 'form'
          ? roundMoney(toNumber(row.formCount ?? row.quantity, 0) * unitPrice)
          : roundMoney(quantity * unitPrice);

  return {
    id: typeof row.id === 'string' && row.id ? row.id : randomUUID(),
    name: buildRowName(sectionKey, row),
    quantity,
    unit:
      normalizeText(row.unit) ||
      (sectionKey === 'paper' ? 'ədəd' : sectionKey === 'printing' ? 'çap' : sectionKey === 'form' ? 'forma' : 'ədəd'),
    unitPrice,
    total,
    note: normalizeText(row.note) || null,
    paperName: normalizeText(row.paperName) || null,
    format: normalizeText(row.format) || null,
    gramaj: normalizeText(row.gramaj) || null,
    baseQuantity,
    fire,
    totalQuantity,
    price: sectionKey === 'paper' ? unitPrice : sectionKey === 'printing' ? null : sectionKey === 'form' ? null : null,
    printType: normalizeText(row.printType) || null,
    printSide: normalizeText(row.printSide) || null,
    color: normalizeText(row.color) || null,
    printCount: sectionKey === 'printing' ? quantity : null,
    printPrice: sectionKey === 'printing' ? unitPrice : null,
    formCount: sectionKey === 'form' ? quantity : null,
    formPrice: sectionKey === 'form' ? unitPrice : null,
    extraWorkType: normalizeText(row.extraWorkType) || null
  };
}

function normalizeSection(section: CalculationSectionInput, fallback: (typeof DEFAULT_SECTION_TEMPLATES)[number]): NormalizedCalculationSection {
  const key = section.key ?? fallback.key;
  const rows = (section.rows ?? []).map((row) => normalizeRow(key, row));
  const total = roundMoney(rows.reduce((sum, row) => sum + row.total, 0));

  return {
    id: typeof section.id === 'string' && section.id ? section.id : randomUUID(),
    key,
    title: normalizeText(section.title) || fallback.title,
    total,
    rows
  };
}

export function normalizeCalculationInput(input: {
  customerId: string;
  productName: string;
  quantity: number | string;
  note?: string | null;
  status?: CalculationStatus | string | null;
  salePrice?: number | string | null;
  sections?: CalculationSectionInput[] | null;
}) : NormalizedCalculationPayload {
  const normalizedSections = DEFAULT_SECTION_TEMPLATES.map((fallback) => {
    const matchedSection = input.sections?.find((section) => (section.key ?? fallback.key) === fallback.key) ?? null;
    return normalizeSection(matchedSection ?? { key: fallback.key, title: fallback.title, rows: [] }, fallback);
  });

  const salePrice = roundMoney(toNumber(input.salePrice, 0));
  const quantity = toNumber(input.quantity, 0);
  const costPrice = roundMoney(normalizedSections.reduce((sum, section) => sum + section.total, 0));
  const profit = roundMoney(salePrice - costPrice);
  const saleUnitPrice = quantity > 0 ? roundMoney(salePrice / quantity) : 0;
  const status =
    input.status === CalculationStatus.approved || input.status === CalculationStatus.converted
      ? (input.status as CalculationStatus)
      : CalculationStatus.draft;

  return {
    status,
    customerId: input.customerId,
    productName: normalizeText(input.productName) || 'Məhsul',
    quantity,
    note: normalizeText(input.note) || null,
    salePrice,
    costPrice,
    profit,
    saleUnitPrice,
    sections: normalizedSections
  };
}

export function defaultCalculationSections() {
  return DEFAULT_SECTION_TEMPLATES.map((section) => ({
    id: randomUUID(),
    key: section.key,
    title: section.title,
    total: 0,
    rows: [] as NormalizedCalculationRow[]
  }));
}

export function sectionTitles() {
  return DEFAULT_SECTION_TEMPLATES.slice();
}

export function extraWorkOptions() {
  return EXTRA_WORK_TYPES.slice();
}
