import type { ReactNode } from 'react';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Button, Card, Input } from '@bestapp/ui';
import {
  calculateCalculationSummary,
  calculateRowTotal,
  calculationParameterCategoryLabel,
  calculationParameterCategoryOptions,
  createEmptyCalculationRow,
  type CalculationCreateDto,
  type CalculationListItem,
  type CalculationParameterItem,
  type CalculationRowValues,
  type CustomerListItem
} from '@bestapp/shared';
import { formatCurrency, formatNumber } from '../shared/lib/format';

export type CalculationFormState = CalculationCreateDto;

type TariffBracket = {
  limit: number;
  price: number;
};

const PRINT_TARIFFS: Record<string, TariffBracket[]> = {
  '4+0': [
    { limit: 500, price: 60 },
    { limit: 1000, price: 80 },
    { limit: 2000, price: 120 }
  ],
  '4+4': [
    { limit: 500, price: 80 },
    { limit: 1000, price: 120 },
    { limit: 2000, price: 160 }
  ],
  '1+0': [
    { limit: 500, price: 45 },
    { limit: 1000, price: 60 },
    { limit: 2000, price: 90 }
  ],
  '1+1': [
    { limit: 500, price: 60 },
    { limit: 1000, price: 90 },
    { limit: 2000, price: 130 }
  ]
};

const LAMINATION_TARIFFS: Record<string, Record<string, TariffBracket[]>> = {
  mat: {
    '1+0': [
      { limit: 500, price: 30 },
      { limit: 1000, price: 50 },
      { limit: 2000, price: 80 }
    ],
    '1+1': [
      { limit: 500, price: 50 },
      { limit: 1000, price: 80 },
      { limit: 2000, price: 120 }
    ]
  },
  parlaq: {
    '1+0': [
      { limit: 500, price: 25 },
      { limit: 1000, price: 45 },
      { limit: 2000, price: 70 }
    ],
    '1+1': [
      { limit: 500, price: 45 },
      { limit: 1000, price: 70 },
      { limit: 2000, price: 100 }
    ]
  }
};

type PaperDetails = {
  paperFormatText: string;
  paperPerFormatCount: number;
  paperBrakaCount: number;
  paperA1PerFormatCount: number;
  paperType: string;
  paperGram: string;
  paperForm: string;
  paperA1UnitPrice: number;
  paperA1UnitPriceOverridden: boolean;
};

type PrintDetails = {
  printType: '4+0' | '4+4' | '1+0' | '1+1';
  printFormatCount: number;
  printTariffRange: string;
  printPrice: number;
  printPriceOverridden: boolean;
};

type FormDetails = {
  formCount: number;
  formUnitPrice: number;
  formUnitPriceOverridden: boolean;
  formAmount: number;
};

type LaminationDetails = {
  laminationSide: '1+0' | '1+1';
  laminationType: 'mat' | 'parlaq';
  laminationFormatCount: number;
  laminationTariffRange: string;
  laminationPrice: number;
  laminationPriceOverridden: boolean;
};

type PaperParameterMatch = {
  parameter: CalculationParameterItem;
  paperA1UnitPrice: number;
};

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cloneRow(row: CalculationRowValues): CalculationRowValues {
  return {
    ...row,
    variants: row.variants.map((variant) => ({ ...variant })),
    details: row.details && typeof row.details === 'object' ? { ...row.details } : {}
  };
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function toNumber(value: unknown, fallback = 0) {
  if (value == null || value === '') {
    return fallback;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePaperLookupText(value: string) {
  return value
    .toLowerCase()
    .replace(/[\s,./_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findPaperParameterMatch(parameters: CalculationParameterItem[], row: CalculationRowValues): PaperParameterMatch | null {
  const details = normalizeDetails(row) as Partial<PaperDetails>;
  const tokens = [details.paperType, details.paperGram, details.paperForm]
    .map((value) => normalizePaperLookupText(String(value ?? '')))
    .filter(Boolean);

  if (!tokens.length) {
    return null;
  }

  const candidates = parameters.filter((parameter) => parameter.category === 'paper' && parameter.isActive);
  for (const parameter of candidates) {
    const haystack = normalizePaperLookupText([parameter.name, parameter.unit, ...parameter.variants.map((variant) => variant.label), ...parameter.variants.map((variant) => variant.value)].join(' '));
    if (tokens.every((token) => haystack.includes(token))) {
      return {
        parameter,
        paperA1UnitPrice: parameter.price
      };
    }
  }

  return null;
}

function pickTariff(brackets: TariffBracket[], quantity: number) {
  if (!brackets.length) {
    return { price: 0, range: '' };
  }

  for (const bracket of brackets) {
    if (quantity <= bracket.limit) {
      return {
        price: bracket.price,
        range: `1-${bracket.limit}`
      };
    }
  }

  const last = brackets[brackets.length - 1];
  return {
    price: last.price,
    range: `${(brackets[brackets.length - 2]?.limit ?? 0) + 1}+`
  };
}

function createPaperDetails(): PaperDetails {
  return {
    paperFormatText: '',
    paperPerFormatCount: 1,
    paperBrakaCount: 0,
    paperA1PerFormatCount: 1,
    paperType: '',
    paperGram: '',
    paperForm: '',
    paperA1UnitPrice: 0,
    paperA1UnitPriceOverridden: false
  };
}

function createPrintDetails(): PrintDetails {
  return {
    printType: '4+0',
    printFormatCount: 1,
    printTariffRange: '',
    printPrice: 0,
    printPriceOverridden: false
  };
}

function createFormDetails(): FormDetails {
  return {
    formCount: 1,
    formUnitPrice: 0,
    formUnitPriceOverridden: false,
    formAmount: 0
  };
}

function createLaminationDetails(): LaminationDetails {
  return {
    laminationSide: '1+0',
    laminationType: 'mat',
    laminationFormatCount: 1,
    laminationTariffRange: '',
    laminationPrice: 0,
    laminationPriceOverridden: false
  };
}

function createDetailsForCategory(category: CalculationRowValues['category']) {
  switch (category) {
    case 'paper':
      return createPaperDetails();
    case 'printing':
      return createPrintDetails();
    case 'form':
      return createFormDetails();
    case 'lamination':
      return createLaminationDetails();
    default:
      return {};
  }
}

function normalizeDetails(row: CalculationRowValues) {
  return row.details && typeof row.details === 'object' ? { ...row.details } : {};
}

function getPaperDetails(row: CalculationRowValues): PaperDetails {
  const details = normalizeDetails(row);
  return {
    ...createPaperDetails(),
    ...details,
    paperFormatText: typeof details.paperFormatText === 'string' ? details.paperFormatText : '',
    paperPerFormatCount: Math.max(toNumber(details.paperPerFormatCount, 1), 1),
    paperBrakaCount: Math.max(toNumber(details.paperBrakaCount, 0), 0),
    paperA1PerFormatCount: Math.max(toNumber(details.paperA1PerFormatCount, 1), 1),
    paperType: typeof details.paperType === 'string' ? details.paperType : '',
    paperGram: typeof details.paperGram === 'string' ? details.paperGram : '',
    paperForm: typeof details.paperForm === 'string' ? details.paperForm : '',
    paperA1UnitPrice: Math.max(toNumber(details.paperA1UnitPrice, row.unitPrice), 0),
    paperA1UnitPriceOverridden: Boolean(details.paperA1UnitPriceOverridden ?? row.isPriceOverridden)
  };
}

function getPrintDetails(row: CalculationRowValues): PrintDetails {
  const details = normalizeDetails(row);
  const printType = (details.printType as PrintDetails['printType']) ?? '4+0';
  const tariff = pickTariff(PRINT_TARIFFS[printType] ?? PRINT_TARIFFS['4+0'], row.quantity || toNumber(details.printFormatCount, 1));
  return {
    ...createPrintDetails(),
    ...details,
    printType,
    printFormatCount: Math.max(toNumber(details.printFormatCount, 1), 1),
    printTariffRange: typeof details.printTariffRange === 'string' ? details.printTariffRange : tariff.range,
    printPrice: Math.max(toNumber(details.printPrice, row.unitPrice), 0),
    printPriceOverridden: Boolean(details.printPriceOverridden ?? row.isPriceOverridden)
  };
}

function getFormDetails(row: CalculationRowValues): FormDetails {
  const details = normalizeDetails(row);
  return {
    ...createFormDetails(),
    ...details,
    formCount: Math.max(toNumber(details.formCount, row.quantity), 0),
    formUnitPrice: Math.max(toNumber(details.formUnitPrice, row.unitPrice), 0),
    formUnitPriceOverridden: Boolean(details.formUnitPriceOverridden ?? row.isPriceOverridden),
    formAmount: Math.max(toNumber(details.formAmount, row.quantity * row.unitPrice), 0)
  };
}

function getLaminationDetails(row: CalculationRowValues): LaminationDetails {
  const details = normalizeDetails(row);
  const laminationType = (details.laminationType as LaminationDetails['laminationType']) ?? 'mat';
  const laminationSide = (details.laminationSide as LaminationDetails['laminationSide']) ?? '1+0';
  const tariff = pickTariff(LAMINATION_TARIFFS[laminationType]?.[laminationSide] ?? LAMINATION_TARIFFS.mat['1+0'], row.quantity || toNumber(details.laminationFormatCount, 1));
  return {
    ...createLaminationDetails(),
    ...details,
    laminationType,
    laminationSide,
    laminationFormatCount: Math.max(toNumber(details.laminationFormatCount, 1), 1),
    laminationTariffRange: typeof details.laminationTariffRange === 'string' ? details.laminationTariffRange : tariff.range,
    laminationPrice: Math.max(toNumber(details.laminationPrice, row.unitPrice), 0),
    laminationPriceOverridden: Boolean(details.laminationPriceOverridden ?? row.isPriceOverridden)
  };
}

function calculatePaperDerivedValues(row: CalculationRowValues, tiraj: number) {
  const details = getPaperDetails(row);
  const printFormatCount = roundMoney(tiraj / details.paperPerFormatCount);
  const totalPrintFormatCount = roundMoney(printFormatCount + details.paperBrakaCount);
  const totalA1Count = roundMoney(totalPrintFormatCount / details.paperA1PerFormatCount);
  const price = details.paperA1UnitPriceOverridden ? row.unitPrice : details.paperA1UnitPrice;

  return {
    ...row,
    unit: row.unit || 'A1',
    quantity: totalA1Count,
    unitPrice: price,
    isPriceOverridden: details.paperA1UnitPriceOverridden,
    details: {
      ...details,
      paperFormatText: details.paperFormatText,
      paperPerFormatCount: details.paperPerFormatCount,
      paperBrakaCount: details.paperBrakaCount,
      paperA1PerFormatCount: details.paperA1PerFormatCount,
      paperDerivedPrintFormatCount: printFormatCount,
      paperDerivedTotalPrintFormatCount: totalPrintFormatCount,
      paperDerivedTotalA1Count: totalA1Count,
      paperA1UnitPrice: price,
      paperA1UnitPriceOverridden: details.paperA1UnitPriceOverridden
    }
  } satisfies CalculationRowValues;
}

function calculatePrintDerivedValues(row: CalculationRowValues, tiraj: number) {
  const details = getPrintDetails(row);
  const tariff = pickTariff(PRINT_TARIFFS[details.printType] ?? PRINT_TARIFFS['4+0'], tiraj);
  const price = details.printPriceOverridden ? row.unitPrice : tariff.price;

  return {
    ...row,
    unit: row.unit || 'iş',
    quantity: 1,
    unitPrice: price,
    isPriceOverridden: details.printPriceOverridden,
    details: {
      ...details,
      printTariffRange: tariff.range,
      printPrice: price,
      printPriceOverridden: details.printPriceOverridden
    }
  } satisfies CalculationRowValues;
}

function calculateFormDerivedValues(row: CalculationRowValues) {
  const details = getFormDetails(row);
  const price = details.formUnitPriceOverridden ? row.unitPrice : details.formUnitPrice;
  const quantity = details.formCount;
  const amount = roundMoney(quantity * price);

  return {
    ...row,
    unit: row.unit || 'forma',
    quantity,
    unitPrice: price,
    isPriceOverridden: details.formUnitPriceOverridden,
    details: {
      ...details,
      formCount: quantity,
      formUnitPrice: price,
      formAmount: amount,
      formUnitPriceOverridden: details.formUnitPriceOverridden
    }
  } satisfies CalculationRowValues;
}

function calculateLaminationDerivedValues(row: CalculationRowValues, tiraj: number) {
  const details = getLaminationDetails(row);
  const tariff = pickTariff(LAMINATION_TARIFFS[details.laminationType]?.[details.laminationSide] ?? LAMINATION_TARIFFS.mat['1+0'], tiraj);
  const price = details.laminationPriceOverridden ? row.unitPrice : tariff.price;

  return {
    ...row,
    unit: row.unit || 'iş',
    quantity: 1,
    unitPrice: price,
    isPriceOverridden: details.laminationPriceOverridden,
    details: {
      ...details,
      laminationTariffRange: tariff.range,
      laminationPrice: price,
      laminationPriceOverridden: details.laminationPriceOverridden
    }
  } satisfies CalculationRowValues;
}

function calculateGenericDerivedValues(row: CalculationRowValues) {
  return {
    ...row,
    quantity: Math.max(toNumber(row.quantity, 1), 0),
    unitPrice: Math.max(toNumber(row.unitPrice, 0), 0)
  } satisfies CalculationRowValues;
}

function syncRows(rows: CalculationRowValues[], tiraj: number) {
  return rows.map((row) => {
    if (row.category === 'paper') return calculatePaperDerivedValues(row, tiraj);
    if (row.category === 'printing') return calculatePrintDerivedValues(row, tiraj);
    if (row.category === 'form') return calculateFormDerivedValues(row);
    if (row.category === 'lamination') return calculateLaminationDerivedValues(row, tiraj);
    return calculateGenericDerivedValues(row);
  });
}

export function createCalculationForm(): CalculationFormState {
  return {
    date: new Date().toISOString().slice(0, 10),
    customerId: '',
    productName: '',
    quantity: 1,
    note: '',
    salePrice: 0,
    status: 'draft',
    rows: syncRows([createEmptyCalculationRow('paper')], 1)
  };
}

export function mapCalculationToForm(value: CalculationListItem): CalculationFormState {
  return {
    date: value.date,
    customerId: value.customerId,
    productName: value.productName,
    quantity: value.quantity,
    note: value.note ?? '',
    salePrice: value.salePrice,
    status: value.status,
    rows: syncRows(value.rows.map((row) => cloneRow(row)), value.quantity)
  };
}

type CalculationEditorFormProps = {
  value: CalculationFormState;
  customers: CustomerListItem[];
  parameters: CalculationParameterItem[];
  onChange: (next: CalculationFormState) => void;
  onClose: () => void;
  onSave: () => void;
  onConvert: () => void;
  saving?: boolean;
  converting?: boolean;
  converted?: boolean;
};

export function CalculationEditorForm({
  value,
  customers,
  parameters,
  onChange,
  onClose,
  onSave,
  onConvert,
  saving,
  converting,
  converted
}: CalculationEditorFormProps) {
  const summary = calculateCalculationSummary({
    salePrice: value.salePrice,
    quantity: value.quantity,
    rows: value.rows
  });

  const parameterById = new Map(parameters.map((parameter) => [parameter.id, parameter]));
  const parameterOptionsByCategory = calculationParameterCategoryOptions().map((category) => ({
    ...category,
    parameters: parameters.filter((parameter) => parameter.category === category.value && parameter.isActive)
  }));

  const update = (patch: Partial<CalculationFormState>) => {
    const next = {
      ...value,
      ...patch
    };

    onChange({
      ...next,
      rows: syncRows(next.rows, next.quantity)
    });
  };

  const updateRow = (rowId: string, patch: Partial<CalculationRowValues>) => {
    const nextRows = value.rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row));
    onChange({
      ...value,
      rows: syncRows(nextRows, value.quantity)
    });
  };

  const updateRowDetails = (rowId: string, patch: Record<string, unknown>) => {
    const nextRows = value.rows.map((row) => {
      if (row.id !== rowId) {
        return row;
      }

      const nextDetails = {
        ...(row.details && typeof row.details === 'object' ? row.details : {}),
        ...patch
      };

      if (row.category === 'paper') {
        const nextRow: CalculationRowValues = {
          ...row,
          details: nextDetails
        };
        const match = findPaperParameterMatch(parameters, nextRow);
        if (match) {
          const manuallyOverridden = Boolean(nextDetails.paperA1UnitPriceOverridden ?? row.isPriceOverridden);
          nextDetails.paperA1UnitPrice = manuallyOverridden ? toNumber(nextDetails.paperA1UnitPrice, row.unitPrice) : match.paperA1UnitPrice;
          nextDetails.paperA1UnitPriceOverridden = manuallyOverridden;
          return {
            ...row,
            parameterId: row.parameterId ?? match.parameter.id,
            parameterName: row.parameterName || match.parameter.name,
            unit: row.unit || match.parameter.unit || 'A1',
            unitPrice: manuallyOverridden ? row.unitPrice : match.paperA1UnitPrice,
            isPriceOverridden: manuallyOverridden,
            details: nextDetails
          };
        }
      }

      return {
        ...row,
        details: nextDetails
      };
    });
    onChange({
      ...value,
      rows: syncRows(nextRows, value.quantity)
    });
  };

  const removeRow = (rowId: string) => {
    onChange({
      ...value,
      rows: syncRows(value.rows.filter((row) => row.id !== rowId), value.quantity)
    });
  };

  const addRow = (category = value.rows[0]?.category ?? 'paper') => {
    onChange({
      ...value,
      rows: syncRows(
        [
          ...value.rows,
          {
            ...createEmptyCalculationRow(category),
            id: uid(),
            details: createDetailsForCategory(category)
          }
        ],
        value.quantity
      )
    });
  };

  const applyParameter = (rowId: string, parameterId: string) => {
    const parameter = parameterById.get(parameterId);
    if (!parameter) {
      updateRow(rowId, {
        parameterId: null,
        parameterName: '',
        parameterVariant: null,
        variants: [],
        unit: '',
        unitPrice: 0,
        isPriceOverridden: false,
        details: createDetailsForCategory(value.rows.find((row) => row.id === rowId)?.category ?? 'paper')
      });
      return;
    }

    const currentRow = value.rows.find((row) => row.id === rowId);
    const nextDetails = { ...(currentRow?.details && typeof currentRow.details === 'object' ? currentRow.details : {}) };

    if (parameter.category === 'paper') {
      Object.assign(nextDetails, {
        paperType: parameter.name,
        paperA1UnitPrice: parameter.price,
        paperA1UnitPriceOverridden: false
      });
    } else if (parameter.category === 'printing') {
      Object.assign(nextDetails, {
        printType: (parameter.name.match(/4\+0|4\+4|1\+0|1\+1/)?.[0] ?? '4+0') as PrintDetails['printType'],
        printPriceOverridden: false
      });
    } else if (parameter.category === 'form') {
      Object.assign(nextDetails, {
        formUnitPrice: parameter.price,
        formUnitPriceOverridden: false
      });
    } else if (parameter.category === 'lamination') {
      Object.assign(nextDetails, {
        laminationType: /parlaq/i.test(parameter.name) ? 'parlaq' : 'mat',
        laminationPriceOverridden: false
      });
    }

    updateRow(rowId, {
      parameterId: parameter.id,
      parameterName: parameter.name,
      parameterVariant: parameter.variants[0]?.value ?? null,
      variants: parameter.variants,
      unit: parameter.unit || currentRow?.unit || '',
      unitPrice: parameter.price || currentRow?.unitPrice || 0,
      isPriceOverridden: false,
      details: nextDetails
    });
  };

  const resetPriceFromParameter = (rowId: string) => {
    const row = value.rows.find((item) => item.id === rowId);
    if (!row?.parameterId) {
      return;
    }

    const parameter = parameterById.get(row.parameterId);
    if (!parameter) {
      return;
    }

    updateRow(rowId, {
      unitPrice: parameter.price,
      isPriceOverridden: false
    });
  };

  return (
    <div className="space-y-5">
      {converted ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Bu hesablama artıq sifarişə çevrilib. Dəyişiklik sifarişin maya dəyərinə təsir edə bilər.
        </div>
      ) : null}

      <Card className="border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Field label="Tarix">
            <Input type="date" value={value.date} onChange={(event) => update({ date: event.target.value })} />
          </Field>

          <Field label="Müştəri">
            <select
              value={value.customerId}
              onChange={(event) => update({ customerId: event.target.value })}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
            >
              <option value="">Müştəri seçin</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                  {customer.companyName ? ` — ${customer.companyName}` : ''}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Məhsulun adı">
            <Input value={value.productName} onChange={(event) => update({ productName: event.target.value })} />
          </Field>

          <Field label="Tiraj / Say">
            <Input
              type="number"
              min={1}
              value={value.quantity}
              onChange={(event) => {
                const nextQuantity = Math.max(toNumber(event.target.value, 1), 1);
                update({ quantity: nextQuantity });
              }}
            />
          </Field>

          <Field label="Satış qiyməti">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={value.salePrice}
              onChange={(event) => update({ salePrice: Math.max(toNumber(event.target.value, 0), 0) })}
            />
          </Field>
        </div>

        <Field label="Qeyd" className="mt-4">
          <textarea
            value={value.note}
            onChange={(event) => update({ note: event.target.value })}
            className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none"
            placeholder="Qısa qeyd"
          />
        </Field>
      </Card>

      <Card className="border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-base font-semibold text-slate-950">Parametr sətirləri</h4>
            <p className="mt-1 text-sm text-slate-500">Kateqoriya seçin, sonra uyğun sahələr açılacaq və hesablamalar avtomatik yenilənəcək.</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => addRow()}>
            <Plus className="mr-2 h-4 w-4" />
            Parametr əlavə et
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {value.rows.map((row, index) => {
            const rowTotal = calculateRowTotal(row);
            const categoryLabel = calculationParameterCategoryLabel(row.category);

            return (
              <div key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-900">
                    Sətir {index + 1} - {categoryLabel}
                    {row.isPriceOverridden ? <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-700">Qiymət dəyişdirilib</span> : null}
                  </div>
                  <Button type="button" variant="secondary" onClick={() => removeRow(row.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                  <Field label="Kateqoriya">
                    <select
                      value={row.category}
                      onChange={(event) => {
                        const category = event.target.value as CalculationRowValues['category'];
                        updateRow(row.id, {
                          ...createEmptyCalculationRow(category),
                          id: row.id,
                          note: row.note,
                          parameterId: null,
                          parameterName: '',
                          variants: [],
                          details: createDetailsForCategory(category)
                        });
                      }}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                    >
                      {calculationParameterCategoryOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Parametr" className="xl:col-span-2">
                    <select
                      value={row.parameterId ?? ''}
                      onChange={(event) => applyParameter(row.id, event.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                    >
                      <option value="">Parametr seçin</option>
                      {parameterOptionsByCategory
                        .find((option) => option.value === row.category)
                        ?.parameters.map((parameterOption) => (
                          <option key={parameterOption.id} value={parameterOption.id}>
                            {parameterOption.name}
                          </option>
                        ))}
                    </select>
                  </Field>

                  <Field label="Miqdar">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={row.quantity}
                      onChange={(event) => updateRow(row.id, { quantity: Math.max(toNumber(event.target.value, 0), 0) })}
                    />
                  </Field>

                  <Field label="Ölçü vahidi">
                    <Input value={row.unit} onChange={(event) => updateRow(row.id, { unit: event.target.value })} />
                  </Field>

                  <Field label="Qiymət">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={row.unitPrice}
                      onChange={(event) =>
                        updateRow(row.id, {
                          unitPrice: Math.max(toNumber(event.target.value, 0), 0),
                          isPriceOverridden: true
                        })
                      }
                    />
                    {row.parameterId ? (
                      <button
                        type="button"
                        className="mt-1 text-xs font-medium text-sky-700 hover:underline"
                        onClick={() => resetPriceFromParameter(row.id)}
                      >
                        Parametr qiymətinə qaytar
                      </button>
                    ) : null}
                  </Field>
                </div>

                {row.category === 'paper' ? (
                  <PaperFields
                    row={row}
                    onDetailsChange={(patch) => updateRowDetails(row.id, patch)}
                    onNoteChange={(note) => updateRow(row.id, { note })}
                    tiraj={value.quantity}
                  />
                ) : null}
                {row.category === 'printing' ? (
                  <PrintFields
                    row={row}
                    onDetailsChange={(patch) => updateRowDetails(row.id, patch)}
                    onNoteChange={(note) => updateRow(row.id, { note })}
                    tiraj={value.quantity}
                  />
                ) : null}
                {row.category === 'form' ? (
                  <FormFields
                    row={row}
                    onDetailsChange={(patch) => updateRowDetails(row.id, patch)}
                    onNoteChange={(note) => updateRow(row.id, { note })}
                  />
                ) : null}
                {row.category === 'lamination' ? (
                  <LaminationFields
                    row={row}
                    onDetailsChange={(patch) => updateRowDetails(row.id, patch)}
                    onNoteChange={(note) => updateRow(row.id, { note })}
                    tiraj={value.quantity}
                  />
                ) : null}

                {row.category !== 'paper' && row.category !== 'printing' && row.category !== 'form' && row.category !== 'lamination' ? (
                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                    <Field label="Cəmi">
                      <Input value={formatCurrency(rowTotal)} readOnly />
                    </Field>
                    <Field label="Qeyd" className="xl:col-span-5">
                      <Input value={row.note} onChange={(event) => updateRow(row.id, { note: event.target.value })} />
                    </Field>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h4 className="text-base font-semibold text-slate-950">Avtomatik yekun</h4>
            <p className="mt-1 text-sm text-slate-500">Qiymətlər dəyişdikcə nəticə dərhal yenilənir.</p>
          </div>
          <div className="text-sm text-slate-500">
            Ədəd satış qiyməti: <span className="font-semibold text-slate-950">{formatCurrency(summary.saleUnitPrice)}</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Summary label="Kağız məbləği" value={formatCurrency(summary.paperAmount)} />
          <Summary label="Forma məbləği" value={formatCurrency(summary.formAmount)} />
          <Summary label="Laminasiya məbləği" value={formatCurrency(summary.laminationAmount)} />
          <Summary label="Digər maya xərcləri" value={formatCurrency(summary.otherCostAmount)} />
          <Summary label="Maya dəyəri" value={formatCurrency(summary.costPrice)} />
          <Summary label="Çap / qazanc" value={formatCurrency(summary.printRevenue)} />
          <Summary label="Satış qiyməti" value={formatCurrency(summary.salePrice)} />
          <Summary label="Qazanc" value={formatCurrency(summary.profit)} />
          <Summary label="Ədəd maya" value={formatCurrency(summary.unitCost)} />
          <Summary label="Ədəd satış qiyməti" value={formatCurrency(summary.saleUnitPrice)} />
          <Summary label="Qazanc faizi" value={`${formatNumber(summary.profitPercent, 2)}%`} />
          <Summary label="Sətir sayı" value={formatNumber(value.rows.length, 0)} />
        </div>
      </Card>

      <div className="flex flex-wrap justify-between gap-3">
        <Button type="button" variant="secondary" onClick={() => addRow()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Sətir əlavə et
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Bağla
          </Button>
          <Button type="button" variant="secondary" onClick={onSave} disabled={saving || converting}>
            {saving ? 'Yadda saxlanılır...' : 'Yadda saxla'}
          </Button>
          <Button type="button" onClick={onConvert} disabled={saving || converting || converted}>
            {converting ? 'Çevrilir...' : converted ? 'Sifarişə çevrilib' : 'Sifarişə çevir'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PaperFields({
  row,
  onDetailsChange,
  onNoteChange,
  tiraj
}: {
  row: CalculationRowValues;
  onDetailsChange: (patch: Record<string, unknown>) => void;
  onNoteChange: (value: string) => void;
  tiraj: number;
}) {
  const details = getPaperDetails(row);
  const printFormatCount = roundMoney(tiraj / details.paperPerFormatCount);
  const totalPrintFormatCount = roundMoney(printFormatCount + details.paperBrakaCount);
  const totalA1Count = roundMoney(totalPrintFormatCount / details.paperA1PerFormatCount);

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-dashed border-slate-200 bg-white p-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Çap formatı">
          <select
            value={details.paperFormatText}
            onChange={(event) => onDetailsChange({ paperFormatText: event.target.value })}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
          >
            <option value="">Seçin</option>
            {['45x32', '50x35', '64x45', '70x50'].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Çapa düşən say">
          <Input
            type="number"
            min={1}
            value={details.paperPerFormatCount}
            onChange={(event) => onDetailsChange({ paperPerFormatCount: Math.max(toNumber(event.target.value, 1), 1) })}
          />
        </Field>
        <Field label="Brak">
          <Input
            type="number"
            min={0}
            value={details.paperBrakaCount}
            onChange={(event) => onDetailsChange({ paperBrakaCount: Math.max(toNumber(event.target.value, 0), 0) })}
          />
        </Field>
        <Field label="A1-ə düşən çap formatı sayı">
          <Input
            type="number"
            min={1}
            value={details.paperA1PerFormatCount}
            onChange={(event) => onDetailsChange({ paperA1PerFormatCount: Math.max(toNumber(event.target.value, 1), 1) })}
          />
        </Field>
        <Field label="Kağız növü">
          <Input value={details.paperType} onChange={(event) => onDetailsChange({ paperType: event.target.value })} />
        </Field>
        <Field label="Kağız qramı">
          <Input value={details.paperGram} onChange={(event) => onDetailsChange({ paperGram: event.target.value })} />
        </Field>
        <Field label="Kağız forma">
          <Input value={details.paperForm} onChange={(event) => onDetailsChange({ paperForm: event.target.value })} />
        </Field>
        <Field label="Ədəd qiyməti">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={details.paperA1UnitPrice}
            onChange={(event) =>
              onDetailsChange({
                paperA1UnitPrice: Math.max(toNumber(event.target.value, 0), 0),
                paperA1UnitPriceOverridden: true
              })
            }
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Field label="Çap sayı">
          <Input value={formatNumber(printFormatCount, 2)} readOnly />
        </Field>
        <Field label="Ümumi çap sayı">
          <Input value={formatNumber(totalPrintFormatCount, 2)} readOnly />
        </Field>
        <Field label="İstifadə olunan A1 sayı">
          <Input value={formatNumber(totalA1Count, 2)} readOnly />
        </Field>
        <Field label="Kağız cəmi">
          <Input value={formatCurrency(rowTotalFromCount(totalA1Count, details.paperA1UnitPrice))} readOnly />
        </Field>
      </div>
    </div>
  );
}

function PrintFields({
  row,
  onDetailsChange,
  onNoteChange,
  tiraj
}: {
  row: CalculationRowValues;
  onDetailsChange: (patch: Record<string, unknown>) => void;
  onNoteChange: (value: string) => void;
  tiraj: number;
}) {
  const details = getPrintDetails(row);
  const tariff = pickTariff(PRINT_TARIFFS[details.printType] ?? PRINT_TARIFFS['4+0'], tiraj);

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-dashed border-slate-200 bg-white p-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Çap növü">
          <select
            value={details.printType}
            onChange={(event) => onDetailsChange({ printType: event.target.value, printPriceOverridden: false })}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
          >
            {['4+0', '4+4', '1+0', '1+1'].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Çap formatı sayı">
          <Input
            type="number"
            min={1}
            value={details.printFormatCount}
            onChange={(event) => onDetailsChange({ printFormatCount: Math.max(toNumber(event.target.value, 1), 1) })}
          />
        </Field>
        <Field label="Tarif aralığı">
          <Input value={tariff.range} readOnly />
        </Field>
        <Field label="Çap qiyməti">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={details.printPrice}
            onChange={(event) =>
              onDetailsChange({
                printPrice: Math.max(toNumber(event.target.value, 0), 0),
                printPriceOverridden: true
              })
            }
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Çap / qazanc">
          <Input value={formatCurrency(details.printPrice)} readOnly />
        </Field>
        <Field label="Qeyd">
          <Input value={row.note} onChange={(event) => onNoteChange(event.target.value)} />
        </Field>
      </div>
    </div>
  );
}

function FormFields({
  row,
  onDetailsChange,
  onNoteChange
}: {
  row: CalculationRowValues;
  onDetailsChange: (patch: Record<string, unknown>) => void;
  onNoteChange: (value: string) => void;
}) {
  const details = getFormDetails(row);
  const amount = roundMoney(details.formCount * details.formUnitPrice);

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-dashed border-slate-200 bg-white p-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Forma sayı">
          <Input
            type="number"
            min={0}
            value={details.formCount}
            onChange={(event) => onDetailsChange({ formCount: Math.max(toNumber(event.target.value, 0), 0) })}
          />
        </Field>
        <Field label="1 forma qiyməti">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={details.formUnitPrice}
            onChange={(event) =>
              onDetailsChange({
                formUnitPrice: Math.max(toNumber(event.target.value, 0), 0),
                formUnitPriceOverridden: true
              })
            }
          />
        </Field>
        <Field label="Cəmi forma məbləği">
          <Input value={formatCurrency(amount)} readOnly />
        </Field>
      </div>
      <Field label="Qeyd">
        <Input value={row.note} onChange={(event) => onNoteChange(event.target.value)} />
      </Field>
    </div>
  );
}

function LaminationFields({
  row,
  onDetailsChange,
  onNoteChange,
  tiraj
}: {
  row: CalculationRowValues;
  onDetailsChange: (patch: Record<string, unknown>) => void;
  onNoteChange: (value: string) => void;
  tiraj: number;
}) {
  const details = getLaminationDetails(row);
  const tariff = pickTariff(LAMINATION_TARIFFS[details.laminationType]?.[details.laminationSide] ?? LAMINATION_TARIFFS.mat['1+0'], tiraj);

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-dashed border-slate-200 bg-white p-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Laminasiya tərəfi">
          <select
            value={details.laminationSide}
            onChange={(event) => onDetailsChange({ laminationSide: event.target.value, laminationPriceOverridden: false })}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
          >
            {['1+0', '1+1'].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Laminasiya növü">
          <select
            value={details.laminationType}
            onChange={(event) => onDetailsChange({ laminationType: event.target.value, laminationPriceOverridden: false })}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
          >
            {['mat', 'parlaq'].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Çap formatı sayı">
          <Input
            type="number"
            min={1}
            value={details.laminationFormatCount}
            onChange={(event) => onDetailsChange({ laminationFormatCount: Math.max(toNumber(event.target.value, 1), 1) })}
          />
        </Field>
        <Field label="Tarif aralığı">
          <Input value={tariff.range} readOnly />
        </Field>
        <Field label="Laminasiya qiyməti">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={details.laminationPrice}
            onChange={(event) =>
              onDetailsChange({
                laminationPrice: Math.max(toNumber(event.target.value, 0), 0),
                laminationPriceOverridden: true
              })
            }
          />
        </Field>
        <Field label="Laminasiya məbləği">
          <Input value={formatCurrency(details.laminationPrice)} readOnly />
        </Field>
      </div>
      <Field label="Qeyd">
        <Input value={row.note} onChange={(event) => onNoteChange(event.target.value)} />
      </Field>
    </div>
  );
}

function rowTotalFromCount(quantity: number, unitPrice: number) {
  return formatCurrency(roundMoney(quantity * unitPrice));
}

function Field({
  label,
  children,
  className
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block space-y-2 ${className ?? ''}`}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-950">{value}</div>
    </div>
  );
}
