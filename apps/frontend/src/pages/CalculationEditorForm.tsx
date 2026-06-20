import type { ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Card, Input } from '@bestapp/ui';
import {
  CALCULATION_TEMPLATES,
  calculateCalculation,
  defaultCalculationValues,
  type CalculationExtraCostItem,
  type CalculationFormValues,
  type CalculationSummary,
  type CustomerListItem
} from '@bestapp/shared';
import { formatCurrency, formatNumber } from '../shared/lib/format';

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toNumber(value: string | number | null | undefined) {
  if (value == null || value === '') return 0;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function createExtraCostItem(): CalculationExtraCostItem {
  return {
    id: uid(),
    name: '',
    quantity: 1,
    unit: 'ədəd',
    unitPrice: 0,
    total: 0,
    note: ''
  };
}

function computeExtraCost(item: CalculationExtraCostItem): CalculationExtraCostItem {
  return {
    ...item,
    total: roundMoney(item.quantity * item.unitPrice)
  };
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-950">{value}</div>
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

export function createCalculationForm(templateKey = 'certificate_sheet') {
  return defaultCalculationValues(templateKey as Parameters<typeof defaultCalculationValues>[0]);
}

export function mapCalculationToForm(value: Partial<CalculationFormValues> & { templateKey?: CalculationFormValues['templateKey'] }) {
  return {
    ...defaultCalculationValues(value.templateKey ?? 'certificate_sheet'),
    ...value,
    extraCosts: (value.extraCosts ?? []).map((item) => ({
      id: item.id ?? uid(),
      name: item.name ?? '',
      quantity: item.quantity ?? 1,
      unit: item.unit ?? 'ədəd',
      unitPrice: item.unitPrice ?? 0,
      total: item.total ?? (item.quantity ?? 1) * (item.unitPrice ?? 0),
      note: item.note ?? ''
    })),
    catalog: {
      ...defaultCalculationValues(value.templateKey ?? 'certificate_sheet').catalog,
      ...(value.catalog ?? {})
    }
  };
}

type CalculationEditorFormProps = {
  value: CalculationFormValues;
  customers: CustomerListItem[];
  onChange: (next: CalculationFormValues) => void;
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
  onChange,
  onClose,
  onSave,
  onConvert,
  saving,
  converting,
  converted
}: CalculationEditorFormProps) {
  const computed = calculateCalculation(value);
  const summary = computed.summary;
  const template = CALCULATION_TEMPLATES.find((item) => item.key === value.templateKey) ?? CALCULATION_TEMPLATES[0];
  const showCatalog = value.templateKey === 'catalog_multi_page';

  const update = (patch: Partial<CalculationFormValues>) => {
    onChange({
      ...value,
      ...patch
    });
  };

  const updateCatalog = (patch: Partial<CalculationFormValues['catalog']>) => {
    onChange({
      ...value,
      catalog: {
        ...value.catalog,
        ...patch
      }
    });
  };

  const updateExtraCost = (itemId: string, patch: Partial<CalculationExtraCostItem>) => {
    onChange({
      ...value,
      extraCosts: value.extraCosts.map((item) => (item.id === itemId ? computeExtraCost({ ...item, ...patch }) : item))
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
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Şablon</h4>
            <p className="mt-1 text-sm text-slate-500">{template.description}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {CALCULATION_TEMPLATES.map((item) => {
              const active = item.key === value.templateKey;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...defaultCalculationValues(item.key),
                      customerId: value.customerId,
                      productName: value.productName,
                      quantity: value.quantity,
                      readySize: value.readySize,
                      salePrice: value.salePrice,
                      note: value.note,
                      status: value.status,
                      extraCosts: value.extraCosts
                    })
                  }
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    active ? 'border-sky-300 bg-sky-50 text-sky-900' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-sm font-semibold">{item.label}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">{item.description}</div>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      <Card className="border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                </option>
              ))}
            </select>
          </Field>

          <Field label="Məhsulun adı">
            <Input value={value.productName} onChange={(event) => update({ productName: event.target.value })} />
          </Field>

          <Field label="Tiraj">
            <Input type="number" min={0} value={value.quantity} onChange={(event) => update({ quantity: toNumber(event.target.value) })} />
          </Field>

          <Field label="Hazır ölçü">
            <Input value={value.readySize} onChange={(event) => update({ readySize: event.target.value })} />
          </Field>

          <Field label="Çap vərəqi formatı">
            <select
              value={value.sheetFormat}
              onChange={(event) => update({ sheetFormat: event.target.value as CalculationFormValues['sheetFormat'] })}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
            >
              <option value="A3">A3</option>
              <option value="A2">A2</option>
              <option value="A1">A1</option>
              <option value="70x100">70x100</option>
              <option value="64x90">64x90</option>
              <option value="custom">Custom</option>
            </select>
          </Field>

          {value.sheetFormat === 'custom' ? (
            <Field label="Format adı">
              <Input value={value.sheetFormatCustom} onChange={(event) => update({ sheetFormatCustom: event.target.value })} />
            </Field>
          ) : null}

          <Field label="Bir vərəqdə yerləşən ədəd">
            <Input
              type="number"
              min={1}
              value={value.sheetPlacementCount}
              onChange={(event) => update({ sheetPlacementCount: Math.max(toNumber(event.target.value), 1) })}
            />
          </Field>

          <Field label="A1-ə çevirmə əmsalı">
            <Input
              type="number"
              min={0.01}
              step="0.01"
              value={value.a1ConversionFactor}
              onChange={(event) => update({ a1ConversionFactor: Math.max(toNumber(event.target.value), 0.01) })}
            />
          </Field>

          <Field label="Kağız növü">
            <Input value={value.paperType} onChange={(event) => update({ paperType: event.target.value })} />
          </Field>

          <Field label="Kağız qramı">
            <Input value={value.paperGram} onChange={(event) => update({ paperGram: event.target.value })} />
          </Field>

          <Field label="Kağız alış qiyməti">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={value.paperPurchasePrice}
              onChange={(event) => update({ paperPurchasePrice: toNumber(event.target.value) })}
            />
          </Field>

          <Field label="Rəng">
            <select
              value={value.color}
              onChange={(event) => update({ color: event.target.value as CalculationFormValues['color'] })}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
            >
              <option value="4+0">4+0</option>
              <option value="4+4">4+4</option>
              <option value="1+0">1+0</option>
              <option value="1+1">1+1</option>
            </select>
          </Field>

          <Field label="Birüzlü / İküzlü">
            <select
              value={value.printSide}
              onChange={(event) => update({ printSide: event.target.value as CalculationFormValues['printSide'] })}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
            >
              <option value="single">Birüzlü</option>
              <option value="double">İküzlü</option>
            </select>
          </Field>

          <Field label="Prilotka">
            <Input type="number" min={0} value={value.prilotka} onChange={(event) => update({ prilotka: toNumber(event.target.value) })} />
          </Field>

          <Field label="Forma sayı">
            <Input type="number" min={0} value={value.formCount} onChange={(event) => update({ formCount: toNumber(event.target.value) })} />
          </Field>

          <Field label="Forma qiyməti">
            <Input type="number" min={0} step="0.01" value={value.formPrice} onChange={(event) => update({ formPrice: toNumber(event.target.value) })} />
          </Field>

          <Field label="Çap hesablanması">
            <select
              value={value.printPricingMode}
              onChange={(event) => update({ printPricingMode: event.target.value as CalculationFormValues['printPricingMode'] })}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
            >
              <option value="per_unit">Vahid qiymətlə</option>
              <option value="fixed">Sabit qiymətlə</option>
            </select>
          </Field>

          <Field label="Çap sayı">
            <Input type="number" min={0} value={value.printCount} onChange={(event) => update({ printCount: toNumber(event.target.value) })} />
          </Field>

          <Field label="Çap vahid qiyməti">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={value.printUnitPrice}
              onChange={(event) => update({ printUnitPrice: toNumber(event.target.value) })}
            />
          </Field>

          {value.printPricingMode === 'fixed' ? (
            <Field label="Sabit çap qiyməti">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={value.printFixedPrice}
                onChange={(event) => update({ printFixedPrice: toNumber(event.target.value) })}
              />
            </Field>
          ) : null}

          <Field label="Satış qiyməti">
            <Input type="number" min={0} step="0.01" value={value.salePrice} onChange={(event) => update({ salePrice: toNumber(event.target.value) })} />
          </Field>

          <Field label="Status">
            <select
              value={value.status}
              onChange={(event) => update({ status: event.target.value as CalculationFormValues['status'] })}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
            >
              <option value="draft">Qaralama</option>
              <option value="approved">Təsdiqləndi</option>
              <option value="converted">Sifarişə çevrildi</option>
            </select>
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

      {showCatalog ? (
        <Card className="border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h4 className="text-base font-semibold text-slate-950">Kataloq / çox səhifəli iş sahəsi</h4>
            <p className="mt-1 text-sm text-slate-500">İç və cover hesablamaları avtomatik yenilənir.</p>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h5 className="text-sm font-semibold text-slate-900">İç səhifələr</h5>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="İç səhifə sayı">
                  <Input
                    type="number"
                    min={0}
                    value={value.catalog.innerPageCount}
                    onChange={(event) => updateCatalog({ innerPageCount: toNumber(event.target.value) })}
                  />
                </Field>
                <Field label="İç yerləşmə sayı">
                  <Input
                    type="number"
                    min={1}
                    value={value.catalog.innerPlacementCount}
                    onChange={(event) => updateCatalog({ innerPlacementCount: Math.max(toNumber(event.target.value), 1) })}
                  />
                </Field>
                <Field label="İç kağız növü">
                  <Input value={value.catalog.innerPaperType} onChange={(event) => updateCatalog({ innerPaperType: event.target.value })} />
                </Field>
                <Field label="İç kağız qramı">
                  <Input value={value.catalog.innerPaperGram} onChange={(event) => updateCatalog({ innerPaperGram: event.target.value })} />
                </Field>
                <Field label="İç kağız qiyməti">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={value.catalog.innerPaperPrice}
                    onChange={(event) => updateCatalog({ innerPaperPrice: toNumber(event.target.value) })}
                  />
                </Field>
                <Field label="İç prilotka">
                  <Input type="number" min={0} value={value.catalog.innerPrilotka} onChange={(event) => updateCatalog({ innerPrilotka: toNumber(event.target.value) })} />
                </Field>
                <Field label="İç forma sayı">
                  <Input type="number" min={0} value={value.catalog.innerFormCount} onChange={(event) => updateCatalog({ innerFormCount: toNumber(event.target.value) })} />
                </Field>
                <Field label="İç forma qiyməti">
                  <Input type="number" min={0} step="0.01" value={value.catalog.innerFormPrice} onChange={(event) => updateCatalog({ innerFormPrice: toNumber(event.target.value) })} />
                </Field>
                <Field label="İç çap qiyməti">
                  <Input type="number" min={0} step="0.01" value={value.catalog.innerPrintPrice} onChange={(event) => updateCatalog({ innerPrintPrice: toNumber(event.target.value) })} />
                </Field>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h5 className="text-sm font-semibold text-slate-900">Cover</h5>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Cover səhifə sayı">
                  <Input
                    type="number"
                    min={0}
                    value={value.catalog.coverPageCount}
                    onChange={(event) => updateCatalog({ coverPageCount: toNumber(event.target.value) })}
                  />
                </Field>
                <Field label="Cover yerləşmə sayı">
                  <Input
                    type="number"
                    min={1}
                    value={value.catalog.coverPlacementCount}
                    onChange={(event) => updateCatalog({ coverPlacementCount: Math.max(toNumber(event.target.value), 1) })}
                  />
                </Field>
                <Field label="Cover kağız növü">
                  <Input value={value.catalog.coverPaperType} onChange={(event) => updateCatalog({ coverPaperType: event.target.value })} />
                </Field>
                <Field label="Cover kağız qramı">
                  <Input value={value.catalog.coverPaperGram} onChange={(event) => updateCatalog({ coverPaperGram: event.target.value })} />
                </Field>
                <Field label="Cover kağız qiyməti">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={value.catalog.coverPaperPrice}
                    onChange={(event) => updateCatalog({ coverPaperPrice: toNumber(event.target.value) })}
                  />
                </Field>
                <Field label="Cover prilotka">
                  <Input type="number" min={0} value={value.catalog.coverPrilotka} onChange={(event) => updateCatalog({ coverPrilotka: toNumber(event.target.value) })} />
                </Field>
                <Field label="Cover forma sayı">
                  <Input type="number" min={0} value={value.catalog.coverFormCount} onChange={(event) => updateCatalog({ coverFormCount: toNumber(event.target.value) })} />
                </Field>
                <Field label="Cover forma qiyməti">
                  <Input type="number" min={0} step="0.01" value={value.catalog.coverFormPrice} onChange={(event) => updateCatalog({ coverFormPrice: toNumber(event.target.value) })} />
                </Field>
                <Field label="Cover çap qiyməti">
                  <Input type="number" min={0} step="0.01" value={value.catalog.coverPrintPrice} onChange={(event) => updateCatalog({ coverPrintPrice: toNumber(event.target.value) })} />
                </Field>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Laminasiya sayı">
              <Input
                type="number"
                min={0}
                value={value.catalog.laminationQuantity}
                onChange={(event) => updateCatalog({ laminationQuantity: toNumber(event.target.value) })}
              />
            </Field>
            <Field label="Laminasiya vahid qiyməti">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={value.catalog.laminationUnitPrice}
                onChange={(event) => updateCatalog({ laminationUnitPrice: toNumber(event.target.value) })}
              />
            </Field>
          </div>
        </Card>
      ) : null}

      <Card className="border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h4 className="text-base font-semibold text-slate-950">Digər xərc</h4>
            <p className="mt-1 text-sm text-slate-500">Yalnız xüsusi hallarda əlavə xərc sətiri əlavə edin.</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onChange({ ...value, extraCosts: [...value.extraCosts, createExtraCostItem()] })}
          >
            <Plus className="mr-2 h-4 w-4" />
            Sətir əlavə et
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {value.extraCosts.length ? (
            value.extraCosts.map((item, index) => (
              <div key={item.id} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 xl:grid-cols-6">
                <Field label={`Xərc ${index + 1}`} className="xl:col-span-2">
                  <Input value={item.name} onChange={(event) => updateExtraCost(item.id, { name: event.target.value })} />
                </Field>
                <Field label="Say / Miqdar">
                  <Input
                    type="number"
                    min={0}
                    value={item.quantity}
                    onChange={(event) => updateExtraCost(item.id, { quantity: toNumber(event.target.value) })}
                  />
                </Field>
                <Field label="Ölçü vahidi">
                  <Input value={item.unit} onChange={(event) => updateExtraCost(item.id, { unit: event.target.value })} />
                </Field>
                <Field label="Ədəd qiyməti">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(event) => updateExtraCost(item.id, { unitPrice: toNumber(event.target.value) })}
                  />
                </Field>
                <Field label="Cəmi">
                  <Input value={formatCurrency(item.total)} readOnly />
                </Field>
                <Field label="Qeyd" className="xl:col-span-5">
                  <Input value={item.note ?? ''} onChange={(event) => updateExtraCost(item.id, { note: event.target.value })} />
                </Field>
                <div className="flex items-end justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onChange({ ...value, extraCosts: value.extraCosts.filter((row) => row.id !== item.id) })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              Heç bir əlavə xərc yoxdur.
            </div>
          )}
        </div>
      </Card>

      <Card className="border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h4 className="text-base font-semibold text-slate-950">Avtomatik nəticə</h4>
            <p className="mt-1 text-sm text-slate-500">Hesablamalar dəyişdikcə aşağıdakı yekunlar yenilənir.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryRow label="Kağız sərfi" value={formatNumber(summary.paperUsage, 2)} />
          <SummaryRow label="Kağız məbləği" value={formatCurrency(summary.paperAmount)} />
          <SummaryRow label="Forma sayı" value={formatNumber(summary.formCount, 2)} />
          <SummaryRow label="Forma məbləği" value={formatCurrency(summary.formAmount)} />
          <SummaryRow label="Çap sayı" value={formatNumber(summary.printCount, 2)} />
          <SummaryRow label="Çap məbləği" value={formatCurrency(summary.printAmount)} />
          <SummaryRow label="Əlavə işlər" value={formatCurrency(summary.extraWorkAmount)} />
          <SummaryRow label="Maya dəyəri" value={formatCurrency(summary.costPrice)} />
          <SummaryRow label="Satış qiyməti" value={formatCurrency(summary.salePrice)} />
          <SummaryRow label="Ədəd satış qiyməti" value={formatCurrency(summary.saleUnitPrice)} />
          <SummaryRow label="Qazanc" value={formatCurrency(summary.profit)} />
          <SummaryRow label="Qazanc faizi" value={`${formatNumber(summary.profitPercent, 2)}%`} />
        </div>
      </Card>

      <div className="flex flex-wrap justify-between gap-3">
        <div className="text-sm text-slate-500">Şablon dəyişsəniz, sahələr və formulalar buna uyğun yenilənir.</div>
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
