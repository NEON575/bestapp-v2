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

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cloneRow(row: CalculationRowValues): CalculationRowValues {
  return {
    ...row,
    variants: row.variants.map((variant) => ({ ...variant }))
  };
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
    rows: [createEmptyCalculationRow('paper')]
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
    rows: value.rows.map((row) => cloneRow(row))
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
    onChange({
      ...value,
      ...patch
    });
  };

  const updateRow = (rowId: string, patch: Partial<CalculationRowValues>) => {
    onChange({
      ...value,
      rows: value.rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row))
    });
  };

  const removeRow = (rowId: string) => {
    onChange({
      ...value,
      rows: value.rows.filter((row) => row.id !== rowId)
    });
  };

  const addRow = (category = value.rows[0]?.category ?? 'paper') => {
    onChange({
      ...value,
      rows: [
        ...value.rows,
        {
          ...createEmptyCalculationRow(category),
          id: uid()
        }
      ]
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
        isPriceOverridden: false
      });
      return;
    }

    updateRow(rowId, {
      parameterId: parameter.id,
      parameterName: parameter.name,
      parameterVariant: parameter.variants[0]?.value ?? null,
      variants: parameter.variants,
      unit: parameter.unit,
      unitPrice: parameter.price,
      isPriceOverridden: false
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
              onChange={(event) => update({ quantity: Math.max(Number(event.target.value || 0), 1) })}
            />
          </Field>

          <Field label="Satış qiyməti">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={value.salePrice}
              onChange={(event) => update({ salePrice: Math.max(Number(event.target.value || 0), 0) })}
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
            <p className="mt-1 text-sm text-slate-500">Kateqoriya seçin, sonra parametr əlavə edin. Qiymət avtomatik gəlir.</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => addRow()}>
            <Plus className="mr-2 h-4 w-4" />
            Parametr əlavə et
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {value.rows.map((row, index) => {
            const parameter = row.parameterId ? parameterById.get(row.parameterId) : null;
            const rowTotal = calculateRowTotal(row);

            return (
              <div key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-900">
                    Sətir {index + 1}
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
                      onChange={(event) =>
                        updateRow(row.id, {
                          ...createEmptyCalculationRow(event.target.value as CalculationRowValues['category']),
                          id: row.id,
                          note: row.note
                        })
                      }
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
                      onChange={(event) => updateRow(row.id, { quantity: Math.max(Number(event.target.value || 0), 0) })}
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
                          unitPrice: Math.max(Number(event.target.value || 0), 0),
                          isPriceOverridden: true
                        })
                      }
                    />
                    {parameter ? (
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

                {row.variants.length ? (
                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                    <Field label="Variant" className="xl:col-span-2">
                      <select
                        value={row.parameterVariant ?? ''}
                        onChange={(event) => updateRow(row.id, { parameterVariant: event.target.value || null })}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                      >
                        <option value="">Variant seçin</option>
                        {row.variants.map((variant) => (
                          <option key={variant.value} value={variant.value}>
                            {variant.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Cəmi">
                      <Input value={formatCurrency(rowTotal)} readOnly />
                    </Field>
                    <Field label="Qeyd" className="xl:col-span-3">
                      <Input value={row.note} onChange={(event) => updateRow(row.id, { note: event.target.value })} />
                    </Field>
                  </div>
                ) : (
                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                    <Field label="Cəmi">
                      <Input value={formatCurrency(rowTotal)} readOnly />
                    </Field>
                    <Field label="Qeyd" className="xl:col-span-5">
                      <Input value={row.note} onChange={(event) => updateRow(row.id, { note: event.target.value })} />
                    </Field>
                  </div>
                )}
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
          <Summary label="Cəmi xərc" value={formatCurrency(summary.costPrice)} />
          <Summary label="Satış qiyməti" value={formatCurrency(summary.salePrice)} />
          <Summary label="Ədəd maya" value={formatCurrency(summary.unitCost)} />
          <Summary label="Qazanc" value={formatCurrency(summary.profit)} />
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
