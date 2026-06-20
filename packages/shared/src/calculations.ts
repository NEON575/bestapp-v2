export type CalculationTemplateKey = 'certificate_sheet' | 'flyer_booklet' | 'catalog_multi_page' | 'custom';

export type CalculationStatusValue = 'draft' | 'approved' | 'converted';

export type CalculationSheetFormat = 'A3' | 'A2' | 'A1' | '70x100' | '64x90' | 'custom';

export type CalculationPrintColor = '4+0' | '4+4' | '1+0' | '1+1';

export type CalculationPrintSide = 'single' | 'double';

export type CalculationPrintPricingMode = 'per_unit' | 'fixed';

export interface CalculationExtraCostItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  note?: string | null;
}

export interface CalculationCatalogFields {
  innerPageCount: number;
  coverPageCount: number;
  innerPaperType: string;
  innerPaperGram: string;
  innerPaperPrice: number;
  coverPaperType: string;
  coverPaperGram: string;
  coverPaperPrice: number;
  innerPlacementCount: number;
  coverPlacementCount: number;
  innerPrilotka: number;
  coverPrilotka: number;
  innerFormCount: number;
  coverFormCount: number;
  innerFormPrice: number;
  coverFormPrice: number;
  innerPrintPrice: number;
  coverPrintPrice: number;
  laminationQuantity: number;
  laminationUnitPrice: number;
}

export interface CalculationFormValues {
  templateKey: CalculationTemplateKey;
  customerId: string;
  productName: string;
  quantity: number;
  readySize: string;
  sheetFormat: CalculationSheetFormat;
  sheetFormatCustom: string;
  sheetPlacementCount: number;
  a1ConversionFactor: number;
  paperType: string;
  paperGram: string;
  paperPurchasePrice: number;
  color: CalculationPrintColor;
  printSide: CalculationPrintSide;
  prilotka: number;
  formCount: number;
  formPrice: number;
  printPricingMode: CalculationPrintPricingMode;
  printCount: number;
  printUnitPrice: number;
  printFixedPrice: number;
  extraCosts: CalculationExtraCostItem[];
  catalog: CalculationCatalogFields;
  salePrice: number;
  note: string;
  status: CalculationStatusValue;
}

export interface CalculationSummary {
  paperUsage: number;
  paperAmount: number;
  formCount: number;
  formAmount: number;
  printCount: number;
  printAmount: number;
  extraWorkAmount: number;
  costPrice: number;
  salePrice: number;
  unitCost: number;
  saleUnitPrice: number;
  profit: number;
  profitPercent: number;
}

export interface CalculationTemplatePreset {
  key: CalculationTemplateKey;
  label: string;
  description: string;
  defaults: Partial<CalculationFormValues>;
}

export interface CalculationRecord extends CalculationFormValues {
  id: string;
  number: string;
  orderId?: string | null;
  order?: CalculationOrderSnapshot | null;
  customer?: {
    id: string;
    name: string;
    companyName?: string | null;
  } | null;
  summary: CalculationSummary;
  costPrice: number;
  saleUnitPrice: number;
  profit: number;
  profitPercent: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CalculationOrderSnapshot {
  id: string;
  number: string;
  status: string;
  totalAmount?: number;
}

export interface CalculationListQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: CalculationStatusValue;
  customerId?: string;
}

export interface CalculationConvertResult {
  calculation: CalculationRecord;
  order: CalculationOrderSnapshot;
}

export interface CalculationStoredPayload extends CalculationFormValues {
  summary: CalculationSummary;
  costPrice: number;
  saleUnitPrice: number;
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

function createExtraCostItem(item?: Partial<CalculationExtraCostItem>): CalculationExtraCostItem {
  return {
    id: toText(item?.id) || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: toText(item?.name),
    quantity: toNumber(item?.quantity, 0),
    unit: toText(item?.unit),
    unitPrice: toNumber(item?.unitPrice, 0),
    total: roundMoney(toNumber(item?.total, 0)),
    note: item?.note == null ? null : toText(item?.note)
  };
}

function defaultCatalogFields(): CalculationCatalogFields {
  return {
    innerPageCount: 0,
    coverPageCount: 0,
    innerPaperType: '',
    innerPaperGram: '',
    innerPaperPrice: 0,
    coverPaperType: '',
    coverPaperGram: '',
    coverPaperPrice: 0,
    innerPlacementCount: 1,
    coverPlacementCount: 1,
    innerPrilotka: 0,
    coverPrilotka: 0,
    innerFormCount: 0,
    coverFormCount: 0,
    innerFormPrice: 0,
    coverFormPrice: 0,
    innerPrintPrice: 0,
    coverPrintPrice: 0,
    laminationQuantity: 0,
    laminationUnitPrice: 0
  };
}

const SHARED_TEMPLATE_BASE: Array<Pick<CalculationTemplatePreset, 'key' | 'label' | 'description'>> = [
  {
    key: 'certificate_sheet',
    label: 'Sertifikat / vərəq işi',
    description: 'Bir və ya bir neçə vərəq üzərində sadə çap işləri üçün'
  },
  {
    key: 'flyer_booklet',
    label: 'Flayer / buklet',
    description: 'Flayer, broşür və qatlanan işlər üçün'
  },
  {
    key: 'catalog_multi_page',
    label: 'Kataloq / çox səhifəli iş',
    description: 'İç səhifə və cover hesablaması olan çoxsəhifəli işlər üçün'
  },
  {
    key: 'custom',
    label: 'Ümumi custom iş',
    description: 'İstənilən digər çap işi üçün sərbəst hesablama'
  }
];

export const CALCULATION_TEMPLATES: CalculationTemplatePreset[] = SHARED_TEMPLATE_BASE.map((template) => ({
  ...template,
  defaults:
    template.key === 'catalog_multi_page'
      ? {
          quantity: 1,
          readySize: '',
          sheetFormat: 'A1',
          sheetPlacementCount: 1,
          a1ConversionFactor: 1,
          paperType: '',
          paperGram: '',
          paperPurchasePrice: 0,
          color: '4+4',
          printSide: 'double',
          prilotka: 0,
          formCount: 0,
          formPrice: 0,
          printPricingMode: 'per_unit',
          printCount: 0,
          printUnitPrice: 0,
          printFixedPrice: 0,
          extraCosts: [],
          catalog: defaultCatalogFields(),
          salePrice: 0,
          note: '',
          status: 'draft'
        }
      : {
          quantity: 1,
          readySize: '',
          sheetFormat: 'A1',
          sheetPlacementCount: 1,
          a1ConversionFactor: 1,
          paperType: '',
          paperGram: '',
          paperPurchasePrice: 0,
          color: '4+4',
          printSide: 'double',
          prilotka: 0,
          formCount: 1,
          formPrice: 0,
          printPricingMode: 'per_unit',
          printCount: 0,
          printUnitPrice: 0,
          printFixedPrice: 0,
          extraCosts: [],
          catalog: defaultCatalogFields(),
          salePrice: 0,
          note: '',
          status: 'draft'
        }
}));

export function calculationTemplateLabel(key: CalculationTemplateKey) {
  return CALCULATION_TEMPLATES.find((template) => template.key === key)?.label ?? key;
}

export function defaultCalculationValues(templateKey: CalculationTemplateKey = 'certificate_sheet'): CalculationFormValues {
  const template = CALCULATION_TEMPLATES.find((item) => item.key === templateKey) ?? CALCULATION_TEMPLATES[0];
  const defaults = {
    quantity: 1,
    readySize: '',
    sheetFormat: 'A1' as CalculationSheetFormat,
    sheetFormatCustom: '',
    sheetPlacementCount: 1,
    a1ConversionFactor: 1,
    paperType: '',
    paperGram: '',
    paperPurchasePrice: 0,
    color: '4+4' as CalculationPrintColor,
    printSide: 'double' as CalculationPrintSide,
    prilotka: 0,
    formCount: templateKey === 'catalog_multi_page' ? 0 : 1,
    formPrice: 0,
    printPricingMode: 'per_unit' as CalculationPrintPricingMode,
    printCount: 0,
    printUnitPrice: 0,
    printFixedPrice: 0,
    extraCosts: [] as CalculationExtraCostItem[],
    catalog: defaultCatalogFields(),
    salePrice: 0,
    note: '',
    status: 'draft' as CalculationStatusValue
  };

  return {
    templateKey: template.key,
    customerId: '',
    productName: '',
    ...defaults,
    ...template.defaults,
    extraCosts: (template.defaults.extraCosts ?? defaults.extraCosts).map((item) => createExtraCostItem(item)),
    catalog: {
      ...defaults.catalog,
      ...(template.defaults.catalog ?? {})
    }
  };
}

export function sheetFormatFactor(format: CalculationSheetFormat, customFactor?: number | null) {
  if (format === 'A3') return 4;
  if (format === 'A2') return 2;
  if (format === 'A1') return 1;
  if (format === '70x100') return 1;
  if (format === '64x90') return 1.21;
  if (format === 'custom') return toNumber(customFactor, 1);
  return 1;
}

export function normalizeCalculationValues(input: Partial<CalculationFormValues> & { templateKey?: CalculationTemplateKey }): CalculationFormValues {
  const templateKey = input.templateKey ?? 'certificate_sheet';
  const defaults = defaultCalculationValues(templateKey);
  const extraCosts = (input.extraCosts ?? defaults.extraCosts).map((item) => createExtraCostItem(item));
  const catalog = {
    ...defaultCatalogFields(),
    ...(input.catalog ?? {})
  };

  return {
    templateKey,
    customerId: toText(input.customerId),
    productName: toText(input.productName),
    quantity: Math.max(toNumber(input.quantity, defaults.quantity), 0),
    readySize: toText(input.readySize),
    sheetFormat: (input.sheetFormat ?? defaults.sheetFormat) as CalculationSheetFormat,
    sheetFormatCustom: toText(input.sheetFormatCustom),
    sheetPlacementCount: Math.max(toNumber(input.sheetPlacementCount, defaults.sheetPlacementCount), 1),
    a1ConversionFactor: Math.max(toNumber(input.a1ConversionFactor, defaults.a1ConversionFactor), 0.01),
    paperType: toText(input.paperType),
    paperGram: toText(input.paperGram),
    paperPurchasePrice: Math.max(toNumber(input.paperPurchasePrice, defaults.paperPurchasePrice), 0),
    color: (input.color ?? defaults.color) as CalculationPrintColor,
    printSide: (input.printSide ?? defaults.printSide) as CalculationPrintSide,
    prilotka: Math.max(toNumber(input.prilotka, defaults.prilotka), 0),
    formCount: Math.max(toNumber(input.formCount, defaults.formCount), 0),
    formPrice: Math.max(toNumber(input.formPrice, defaults.formPrice), 0),
    printPricingMode: (input.printPricingMode ?? defaults.printPricingMode) as CalculationPrintPricingMode,
    printCount: Math.max(toNumber(input.printCount, defaults.printCount), 0),
    printUnitPrice: Math.max(toNumber(input.printUnitPrice, defaults.printUnitPrice), 0),
    printFixedPrice: Math.max(toNumber(input.printFixedPrice, defaults.printFixedPrice), 0),
    extraCosts,
    catalog: {
      ...catalog,
      innerPageCount: Math.max(toNumber(catalog.innerPageCount, defaults.catalog.innerPageCount), 0),
      coverPageCount: Math.max(toNumber(catalog.coverPageCount, defaults.catalog.coverPageCount), 0),
      innerPaperPrice: Math.max(toNumber(catalog.innerPaperPrice, defaults.catalog.innerPaperPrice), 0),
      coverPaperPrice: Math.max(toNumber(catalog.coverPaperPrice, defaults.catalog.coverPaperPrice), 0),
      innerPlacementCount: Math.max(toNumber(catalog.innerPlacementCount, defaults.catalog.innerPlacementCount), 1),
      coverPlacementCount: Math.max(toNumber(catalog.coverPlacementCount, defaults.catalog.coverPlacementCount), 1),
      innerPrilotka: Math.max(toNumber(catalog.innerPrilotka, defaults.catalog.innerPrilotka), 0),
      coverPrilotka: Math.max(toNumber(catalog.coverPrilotka, defaults.catalog.coverPrilotka), 0),
      innerFormCount: Math.max(toNumber(catalog.innerFormCount, defaults.catalog.innerFormCount), 0),
      coverFormCount: Math.max(toNumber(catalog.coverFormCount, defaults.catalog.coverFormCount), 0),
      innerFormPrice: Math.max(toNumber(catalog.innerFormPrice, defaults.catalog.innerFormPrice), 0),
      coverFormPrice: Math.max(toNumber(catalog.coverFormPrice, defaults.catalog.coverFormPrice), 0),
      innerPrintPrice: Math.max(toNumber(catalog.innerPrintPrice, defaults.catalog.innerPrintPrice), 0),
      coverPrintPrice: Math.max(toNumber(catalog.coverPrintPrice, defaults.catalog.coverPrintPrice), 0),
      laminationQuantity: Math.max(toNumber(catalog.laminationQuantity, defaults.catalog.laminationQuantity), 0),
      laminationUnitPrice: Math.max(toNumber(catalog.laminationUnitPrice, defaults.catalog.laminationUnitPrice), 0)
    },
    salePrice: Math.max(toNumber(input.salePrice, defaults.salePrice), 0),
    note: toText(input.note),
    status: (input.status ?? defaults.status) as CalculationStatusValue
  };
}

function calculateExtraCosts(extraCosts: CalculationExtraCostItem[]) {
  return roundMoney(extraCosts.reduce((sum, item) => sum + roundMoney(item.total || item.quantity * item.unitPrice), 0));
}

export function calculateCalculation(input: Partial<CalculationFormValues> & { templateKey?: CalculationTemplateKey }) {
  const values = normalizeCalculationValues(input);
  if (values.templateKey === 'catalog_multi_page') {
    const catalog = values.catalog;
    const innerPrintCount = catalog.innerPageCount > 0 ? roundMoney((catalog.innerPageCount / 4) * values.quantity) : 0;
    const innerPaperUsage = roundMoney((catalog.innerPageCount / 2) * catalog.innerPrilotka + innerPrintCount);
    const innerA1Count = roundMoney(innerPaperUsage / Math.max(catalog.innerPlacementCount, 1));
    const innerPaperAmount = roundMoney(innerA1Count * catalog.innerPaperPrice);
    const innerFormAmount = roundMoney(catalog.innerFormCount * catalog.innerFormPrice);
    const innerPrintAmount = roundMoney(catalog.innerPageCount > 0 ? (catalog.innerPageCount / 4) * catalog.innerPrintPrice : 0);
    const coverPrintCount = roundMoney(values.quantity);
    const coverPaperUsage = roundMoney(coverPrintCount + catalog.coverPrilotka);
    const coverA1Count = roundMoney(coverPaperUsage / Math.max(catalog.coverPlacementCount, 1));
    const coverPaperAmount = roundMoney(coverA1Count * catalog.coverPaperPrice);
    const coverFormAmount = roundMoney(catalog.coverFormCount * catalog.coverFormPrice);
    const coverPrintAmount = roundMoney(catalog.coverPageCount > 0 ? (catalog.coverPageCount / 4) * catalog.coverPrintPrice : 0);
    const laminationAmount = roundMoney(values.quantity * catalog.laminationUnitPrice);
    const extraCostsAmount = calculateExtraCosts(values.extraCosts);
    const paperAmount = roundMoney(innerPaperAmount + coverPaperAmount);
    const formAmount = roundMoney(innerFormAmount + coverFormAmount);
    const printAmount = roundMoney(innerPrintAmount + coverPrintAmount);
    const extraWorkAmount = roundMoney(extraCostsAmount + laminationAmount);
    const costPrice = roundMoney(paperAmount + formAmount + printAmount + extraWorkAmount);
    const salePrice = roundMoney(values.salePrice);
    const unitCost = values.quantity > 0 ? roundMoney(costPrice / values.quantity) : 0;
    const saleUnitPrice = values.quantity > 0 ? roundMoney(salePrice / values.quantity) : 0;
    const profit = roundMoney(salePrice - costPrice);
    const profitPercent = salePrice > 0 ? roundMoney((profit / salePrice) * 100) : 0;

    return {
      values,
      summary: {
        paperUsage: roundMoney(innerPaperUsage + coverPaperUsage),
        paperAmount,
        formCount: roundMoney(catalog.innerFormCount + catalog.coverFormCount),
        formAmount,
        printCount: roundMoney(innerPrintCount + coverPrintCount),
        printAmount,
        extraWorkAmount,
        costPrice,
        salePrice,
        unitCost,
        saleUnitPrice,
        profit,
        profitPercent
      } satisfies CalculationSummary,
      stored: {
        ...values,
        salePrice,
        summary: {
          paperUsage: roundMoney(innerPaperUsage + coverPaperUsage),
          paperAmount,
          formCount: roundMoney(catalog.innerFormCount + catalog.coverFormCount),
          formAmount,
          printCount: roundMoney(innerPrintCount + coverPrintCount),
          printAmount,
          extraWorkAmount,
          costPrice,
          salePrice,
          unitCost,
          saleUnitPrice,
          profit,
          profitPercent
        },
        costPrice,
        saleUnitPrice,
        profit,
        profitPercent
      }
    };
  }

  const quantity = values.quantity;
  const sheetPlacementCount = Math.max(values.sheetPlacementCount, 1);
  const sheetCount = quantity > 0 ? roundMoney(quantity / sheetPlacementCount) : 0;
  const totalSheetCount = roundMoney(sheetCount + values.prilotka);
  const a1Count = roundMoney(totalSheetCount / Math.max(values.a1ConversionFactor, 0.01));
  const paperAmount = roundMoney(a1Count * values.paperPurchasePrice);
  const formAmount = roundMoney(values.formCount * values.formPrice);
  const printAmount =
    values.printPricingMode === 'fixed'
      ? roundMoney(values.printFixedPrice)
      : roundMoney((values.printCount || sheetCount) * values.printUnitPrice);
  const extraWorkAmount = calculateExtraCosts(values.extraCosts);
  const costPrice = roundMoney(paperAmount + formAmount + printAmount + extraWorkAmount);
  const salePrice = roundMoney(values.salePrice);
  const unitCost = quantity > 0 ? roundMoney(costPrice / quantity) : 0;
  const saleUnitPrice = quantity > 0 ? roundMoney(salePrice / quantity) : 0;
  const profit = roundMoney(salePrice - costPrice);
  const profitPercent = salePrice > 0 ? roundMoney((profit / salePrice) * 100) : 0;

  const summary: CalculationSummary = {
    paperUsage: totalSheetCount,
    paperAmount,
    formCount: values.formCount,
    formAmount,
    printCount: values.printCount || sheetCount,
    printAmount,
    extraWorkAmount,
    costPrice,
    salePrice,
    unitCost,
    saleUnitPrice,
    profit,
    profitPercent
  };

  const stored: CalculationStoredPayload = {
    ...values,
    salePrice,
    summary,
    costPrice,
    saleUnitPrice,
    profit,
    profitPercent
  };

  return {
    values,
    summary,
    stored
  };
}
