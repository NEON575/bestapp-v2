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

export type CalculationParameterVariantValue = string;

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

export interface CalculationParameterListQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: CalculationParameterCategory | '';
  isActive?: boolean | '';
}

export interface CalculationHeaderValues {
  date: string;
  customerId: string;
  productName: string;
  quantity: number;
  note: string;
  salePrice: number;
  status: CalculationStatusValue;
}

export interface CalculationRowValues {
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

export interface CalculationSummaryValues {
  costPrice: number;
  salePrice: number;
  saleUnitPrice: number;
  unitCost: number;
  profit: number;
  profitPercent: number;
}

export interface CalculationSnapshot {
  id: string;
  number: string;
  status: CalculationStatusValue;
  customerId: string;
  customer?: {
    id: string;
    name: string;
    companyName?: string | null;
  } | null;
  date: string;
  productName: string;
  quantity: number;
  note: string;
  salePrice: number;
  costPrice: number;
  profit: number;
  saleUnitPrice: number;
  unitCost: number;
  profitPercent: number;
  orderId?: string | null;
  order?: {
    id: string;
    number: string;
    status: string;
    totalAmount?: number;
  } | null;
  rows: CalculationRowValues[];
  summary: CalculationSummaryValues;
  createdAt?: string;
  updatedAt?: string;
}

export interface CalculationListItem extends CalculationSnapshot {}

export interface CalculationCreateDto extends CalculationHeaderValues {
  rows: CalculationRowValues[];
}

export interface CalculationUpdateDto extends Partial<CalculationCreateDto> {}

export interface CalculationConvertResult {
  calculation: CalculationSnapshot;
  order: {
    id: string;
    number: string;
    status: string;
    totalAmount?: number;
  };
}

export interface CalculationParameterCreateDto {
  category: CalculationParameterCategory;
  name: string;
  variants: string[];
  unit: string;
  price: number;
  isActive?: boolean;
  note?: string;
}

export interface CalculationParameterUpdateDto extends Partial<CalculationParameterCreateDto> {}

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

export function calculationParameterCategoryOptions() {
  return CALCULATION_PARAMETER_CATEGORIES.map((value) => ({
    value,
    label: calculationParameterCategoryLabel(value)
  }));
}

export function defaultCalculationHeader(): CalculationHeaderValues {
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

export function createEmptyCalculationRow(category: CalculationParameterCategory = 'paper'): CalculationRowValues {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
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

export function createCalculationParameterDefaults(category: CalculationParameterCategory): CalculationParameterCreateDto {
  return {
    category,
    name: '',
    variants: [],
    unit: '',
    price: 0,
    isActive: true,
    note: ''
  };
}

export function normalizeCalculationRow(row: Partial<CalculationRowValues> & { category: CalculationParameterCategory }): CalculationRowValues {
  return {
    id: toText(row.id) || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
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

export function calculateRowTotal(row: Pick<CalculationRowValues, 'quantity' | 'unitPrice'>) {
  return roundMoney(toNumber(row.quantity) * toNumber(row.unitPrice));
}

export function calculateCalculationSummary(input: {
  salePrice: number;
  quantity: number;
  rows: CalculationRowValues[];
}) {
  const costPrice = roundMoney(input.rows.reduce((sum, row) => sum + calculateRowTotal(row), 0));
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
  } satisfies CalculationSummaryValues;
}

export function buildCalculationSnapshot(input: {
  id: string;
  number: string;
  status: CalculationStatusValue;
  customerId: string;
  customer?: CalculationSnapshot['customer'];
  date: string;
  productName: string;
  quantity: number;
  note: string;
  salePrice: number;
  rows: CalculationRowValues[];
  orderId?: string | null;
  order?: CalculationSnapshot['order'];
  createdAt?: string;
  updatedAt?: string;
}) {
  const summary = calculateCalculationSummary({
    salePrice: input.salePrice,
    quantity: input.quantity,
    rows: input.rows
  });

  return {
    ...input,
    salePrice: summary.salePrice,
    costPrice: summary.costPrice,
    saleUnitPrice: summary.saleUnitPrice,
    unitCost: summary.unitCost,
    profit: summary.profit,
    profitPercent: summary.profitPercent,
    rows: input.rows,
    summary
  } satisfies CalculationSnapshot;
}
