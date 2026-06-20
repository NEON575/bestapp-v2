import { randomUUID } from 'crypto';

export const CALCULATION_PARAMETER_CATEGORIES = [
  'paper',
  'printing',
  'form',
  'lamination',
  'cutting',
  'creasing',
  'folding',
  'thermal_glue',
  'stapling',
  'punching',
  'manual_work',
  'packaging',
  'other_cost'
] as const;

export type CalculationParameterCategory = (typeof CALCULATION_PARAMETER_CATEGORIES)[number];
export type CalculationStatusValue = 'draft' | 'approved' | 'converted';

export interface CalculationParameterVariantItem {
  label: string;
  value: string;
}

export interface CalculationParameterItem {
  id: string;
  category: CalculationParameterCategory;
  name: string;
  variants: CalculationParameterVariantItem[];
  unit: string;
  price: number;
  isActive: boolean;
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CalculationRow {
  id: string;
  category: CalculationParameterCategory;
  parameterId?: string | null;
  parameterName: string;
  parameterVariant?: string | null;
  variants: CalculationParameterVariantItem[];
  unit: string;
  quantity: number;
  unitPrice: number;
  isPriceOverridden: boolean;
  note: string;
}

export interface CalculationSummary {
  costPrice: number;
  salePrice: number;
  saleUnitPrice: number;
  unitCost: number;
  profit: number;
  profitPercent: number;
}

export interface CalculationHeader {
  date: string;
  customerId: string;
  productName: string;
  quantity: number;
  note: string;
  salePrice: number;
  status: CalculationStatusValue;
}

export interface CalculationStoredPayload extends CalculationHeader {
  rows: CalculationRow[];
  summary: CalculationSummary;
}

export interface CalculationParameterSnapshot {
  id: string;
  category: CalculationParameterCategory;
  name: string;
  variants: CalculationParameterVariantItem[];
  unit: string;
  price: number;
  isActive: boolean;
  note: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CalculationSnapshot extends CalculationHeader {
  id: string;
  number: string;
  customer?: {
    id: string;
    name: string;
    companyName?: string | null;
  } | null;
  orderId?: string | null;
  order?: {
    id: string;
    number: string;
    status: string;
    totalAmount?: number;
  } | null;
  rows: CalculationRow[];
  summary: CalculationSummary;
  createdAt?: string;
  updatedAt?: string;
  costPrice: number;
  saleUnitPrice: number;
  unitCost: number;
  profit: number;
  profitPercent: number;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function toNumber(value: number | string | null | undefined, fallback = 0) {
  if (value == null || value === '') {
    return fallback;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

export function calculationParameterCategoryLabel(category: CalculationParameterCategory) {
  const map: Record<CalculationParameterCategory, string> = {
    paper: 'Kağız',
    printing: 'Çap',
    form: 'Forma',
    lamination: 'Laminasiya',
    cutting: 'Kəsim',
    creasing: 'Beqovka',
    folding: 'Qatlama',
    thermal_glue: 'Termokley',
    stapling: 'Tikiş / Stepler',
    punching: 'Deşmə',
    manual_work: 'Əl işi',
    packaging: 'Qablaşdırma',
    other_cost: 'Digər xərc'
  };

  return map[category];
}

export function calculationParameterCategories() {
  return CALCULATION_PARAMETER_CATEGORIES.map((category) => ({
    value: category,
    label: calculationParameterCategoryLabel(category)
  }));
}

export function defaultCalculationHeader(): CalculationHeader {
  return {
    date: new Date().toISOString().slice(0, 10),
    customerId: '',
    productName: '',
    quantity: 1,
    note: '',
    salePrice: 0,
    status: 'draft'
  };
}

export function createEmptyCalculationRow(category: CalculationParameterCategory = 'paper'): CalculationRow {
  return {
    id: randomUUID(),
    category,
    parameterId: null,
    parameterName: '',
    parameterVariant: null,
    variants: [],
    unit: '',
    quantity: 1,
    unitPrice: 0,
    isPriceOverridden: false,
    note: ''
  };
}

export function normalizeCalculationRow(row: Partial<CalculationRow> & { category: CalculationParameterCategory }): CalculationRow {
  return {
    id: typeof row.id === 'string' && row.id ? row.id : randomUUID(),
    category: row.category,
    parameterId: row.parameterId ?? null,
    parameterName: toText(row.parameterName),
    parameterVariant: row.parameterVariant ?? null,
    variants: Array.isArray(row.variants)
      ? row.variants.map((variant) => ({
          label: toText(variant.label),
          value: toText(variant.value)
        }))
      : [],
    unit: toText(row.unit),
    quantity: Math.max(toNumber(row.quantity, 1), 0),
    unitPrice: Math.max(toNumber(row.unitPrice, 0), 0),
    isPriceOverridden: Boolean(row.isPriceOverridden),
    note: toText(row.note)
  };
}

export function calculateCalculationSummary(input: { salePrice: number; quantity: number; rows: CalculationRow[] }): CalculationSummary {
  const costPrice = roundMoney(input.rows.reduce((sum, row) => sum + roundMoney(row.quantity * row.unitPrice), 0));
  const salePrice = roundMoney(toNumber(input.salePrice, 0));
  const quantity = Math.max(toNumber(input.quantity, 0), 0);
  const saleUnitPrice = quantity > 0 ? roundMoney(salePrice / quantity) : 0;
  const unitCost = quantity > 0 ? roundMoney(costPrice / quantity) : 0;
  const profit = roundMoney(salePrice - costPrice);
  const profitPercent = salePrice > 0 ? roundMoney((profit / salePrice) * 100) : 0;

  return {
    costPrice,
    salePrice,
    saleUnitPrice,
    unitCost,
    profit,
    profitPercent
  };
}

function normalizeHeader(input: Partial<CalculationHeader>): CalculationHeader {
  return {
    date: toText(input.date) || defaultCalculationHeader().date,
    customerId: toText(input.customerId),
    productName: toText(input.productName),
    quantity: Math.max(toNumber(input.quantity, 1), 0),
    note: toText(input.note),
    salePrice: Math.max(toNumber(input.salePrice, 0), 0),
    status: (input.status ?? 'draft') as CalculationStatusValue
  };
}

export function normalizeStoredCalculation(input: Partial<CalculationStoredPayload> & { rows?: unknown }): CalculationStoredPayload {
  const header = normalizeHeader(input);
  const rows = Array.isArray(input.rows)
    ? input.rows
        .map((row) =>
          normalizeCalculationRow(row as Partial<CalculationRow> & { category: CalculationParameterCategory })
        )
        .filter((row) => row.parameterName || row.unit || row.unitPrice || row.quantity)
    : [];
  const summary = calculateCalculationSummary({
    salePrice: header.salePrice,
    quantity: header.quantity,
    rows
  });

  return {
    ...header,
    rows,
    summary
  };
}

export function buildCalculationSnapshot(input: {
  id: string;
  number: string;
  header: CalculationHeader;
  rows: CalculationRow[];
  customer?: CalculationSnapshot['customer'];
  orderId?: string | null;
  order?: CalculationSnapshot['order'];
  createdAt?: string;
  updatedAt?: string;
}) {
  const summary = calculateCalculationSummary({
    salePrice: input.header.salePrice,
    quantity: input.header.quantity,
    rows: input.rows
  });

  return {
    id: input.id,
    number: input.number,
    ...input.header,
    customer: input.customer ?? null,
    orderId: input.orderId ?? null,
    order: input.order ?? null,
    rows: input.rows,
    summary,
    costPrice: summary.costPrice,
    saleUnitPrice: summary.saleUnitPrice,
    unitCost: summary.unitCost,
    profit: summary.profit,
    profitPercent: summary.profitPercent,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt
  } satisfies CalculationSnapshot;
}
