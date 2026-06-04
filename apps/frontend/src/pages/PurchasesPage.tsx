import { type ReactNode, useEffect, useMemo, useState } from 'react';
import type {
  CreatePurchaseEntryDto,
  CreateSupplierDto,
  InventoryMaterialItem,
  PurchaseEntryItem,
  PurchaseEntryQueryDto,
  PurchaseSummary,
  SettingUnitItem,
  SupplierItem,
  UpdateSupplierDto,
  WarehouseItem
} from '@bestapp/shared';
import { SalesPaymentType } from '@bestapp/shared';
import { Button, Input } from '@bestapp/ui';
import { inventoryClient } from '../shared/api/inventory';
import { purchasesClient } from '../shared/api/purchases';
import { settingsClient } from '../shared/api/settings';
import { EmptyState, ErrorState, LoadingState, Modal, PageHeader, Pagination } from '../shared/components';
import { formatCurrency, formatDateOnly, formatNumber } from '../shared/lib/format';
import { getSalesLabel, salesPaymentTypeLabels } from '../shared/lib/salesLabels';
import { useToast } from '../shared/toast/toast-context';

type PurchaseDraft = {
  supplierId: string;
  materialId: string;
  warehouseId: string;
  date: string;
  stockUnit: string;
  packageUnit: string;
  unitsPerPackage: string;
  packageQuantity: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  paymentAmount: string;
  paymentType: string;
  comment: string;
};

type SupplierDraft = {
  name: string;
  phone: string;
  taxId: string;
  notes: string;
  isActive: boolean;
};

const defaultPaymentType = SalesPaymentType.HESAB;
const defaultUnitValue = 'ədəd';

function toInputDate(value?: string | null) {
  if (!value) return new Date().toISOString().slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function createDefaultPurchaseQuery(limit = 20): PurchaseEntryQueryDto {
  return {
    page: 1,
    limit,
    search: '',
    sortBy: 'date',
    sortOrder: 'desc',
    supplierId: '',
    paymentType: '',
    onlyDebtors: false,
    dateFrom: '',
    dateTo: ''
  };
}

function emptyPurchaseDraft(defaultWarehouseId = '', unitValue = defaultUnitValue): PurchaseDraft {
  return {
    supplierId: '',
    materialId: '',
    warehouseId: defaultWarehouseId,
    date: toInputDate(),
    stockUnit: unitValue,
    packageUnit: '',
    unitsPerPackage: '',
    packageQuantity: '',
    quantity: '',
    unitPrice: '',
    amount: '',
    paymentAmount: '',
    paymentType: defaultPaymentType,
    comment: ''
  };
}

function emptySupplierDraft(): SupplierDraft {
  return {
    name: '',
    phone: '',
    taxId: '',
    notes: '',
    isActive: true
  };
}

function createDraft(row: PurchaseEntryItem): PurchaseDraft {
  return {
    supplierId: row.supplier?.id ?? '',
    materialId: row.material?.id ?? '',
    warehouseId: row.warehouse?.id ?? '',
    date: toInputDate(row.date),
    stockUnit: row.stockUnit ?? row.material?.stockUnit ?? row.material?.unit ?? defaultUnitValue,
    packageUnit: row.packageUnit ?? row.material?.packageUnit ?? '',
    unitsPerPackage:
      row.unitsPerPackage != null
        ? String(row.unitsPerPackage)
        : row.material?.defaultUnitsPerPackage != null
          ? String(row.material.defaultUnitsPerPackage)
          : '',
    packageQuantity: row.packageQuantity != null ? String(row.packageQuantity) : '',
    quantity:
      row.totalQuantity != null
        ? String(row.totalQuantity)
        : row.quantity != null
          ? String(row.quantity)
          : '',
    unitPrice: row.unitPrice != null ? String(row.unitPrice) : '',
    amount: row.amount != null ? String(row.amount) : '',
    paymentAmount: row.paymentAmount != null ? String(row.paymentAmount) : '',
    paymentType: row.paymentType ?? defaultPaymentType,
    comment: row.comment ?? ''
  };
}

function toDto(draft: PurchaseDraft): CreatePurchaseEntryDto {
  return {
    supplierId: draft.supplierId,
    materialId: draft.materialId,
    warehouseId: draft.warehouseId || undefined,
    date: draft.date ? new Date(`${draft.date}T00:00:00`).toISOString() : undefined,
    quantity: draft.quantity ? toNumber(draft.quantity) : undefined,
    stockUnit: draft.stockUnit || defaultUnitValue,
    packageUnit: draft.packageUnit || undefined,
    unitsPerPackage: draft.unitsPerPackage ? toNumber(draft.unitsPerPackage) : undefined,
    packageQuantity: draft.packageQuantity ? toNumber(draft.packageQuantity) : undefined,
    unitPrice: draft.unitPrice ? toNumber(draft.unitPrice) : undefined,
    amount: draft.amount ? toNumber(draft.amount) : undefined,
    paymentAmount: draft.paymentAmount ? toNumber(draft.paymentAmount) : undefined,
    paymentType: draft.paymentType || defaultPaymentType,
    comment: draft.comment || undefined
  };
}

function createSupplierDto(draft: SupplierDraft): CreateSupplierDto {
  return {
    name: draft.name.trim(),
    phone: draft.phone || undefined,
    taxId: draft.taxId || undefined,
    notes: draft.notes || undefined,
    isActive: draft.isActive
  };
}

function calculatePreview(draft: PurchaseDraft) {
  const packageQuantity = toNumber(draft.packageQuantity);
  const unitsPerPackage = toNumber(draft.unitsPerPackage);
  const fallbackQuantity = toNumber(draft.quantity);
  const totalQuantity =
    packageQuantity > 0 && unitsPerPackage > 0 ? round(packageQuantity * unitsPerPackage, 4) : round(fallbackQuantity, 4);
  const unitPrice = toNumber(draft.unitPrice);
  const amount = toNumber(draft.amount);
  const computedAmount = totalQuantity > 0 && unitPrice > 0 ? round(totalQuantity * unitPrice, 2) : round(amount, 2);
  const computedUnitPrice = unitPrice > 0 ? round(unitPrice, 4) : totalQuantity > 0 && amount > 0 ? round(amount / totalQuantity, 4) : 0;
  const paymentAmount = round(toNumber(draft.paymentAmount), 2);

  return {
    totalQuantity,
    unitPrice: computedUnitPrice,
    amount: computedAmount,
    remainingDebt: round(computedAmount - paymentAmount, 2)
  };
}

function getActiveUnits(units: SettingUnitItem[]) {
  return units.filter((unit) => unit.isActive);
}

export function PurchasesPage() {
  const toast = useToast();
  const [rows, setRows] = useState<PurchaseEntryItem[]>([]);
  const [summary, setSummary] = useState<PurchaseSummary | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [materials, setMaterials] = useState<InventoryMaterialItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [units, setUnits] = useState<SettingUnitItem[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [query, setQuery] = useState<PurchaseEntryQueryDto>(createDefaultPurchaseQuery());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PurchaseDraft | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickDraft, setQuickDraft] = useState<PurchaseDraft>(emptyPurchaseDraft());
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [supplierDraft, setSupplierDraft] = useState<SupplierDraft>(emptySupplierDraft());
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (nextQuery = query) => {
    setLoading(true);
    setError(null);

    try {
      const [listResponse, summaryResponse, supplierResponse, materialResponse, warehouseResponse, unitResponse] = await Promise.all([
        purchasesClient.list(nextQuery),
        purchasesClient.summary(nextQuery),
        purchasesClient.listSuppliers(),
        inventoryClient.materials({ page: 1, limit: 200, sortBy: 'name', sortOrder: 'asc' }),
        inventoryClient.warehouses(),
        settingsClient.units()
      ]);

      const availableUnits = getActiveUnits(unitResponse);
      const defaultWarehouseId = warehouseResponse[0]?.id ?? '';
      const defaultUnit = availableUnits[0]?.value ?? defaultUnitValue;

      setRows(listResponse.data);
      setMeta(listResponse.meta);
      setSummary(summaryResponse);
      setSuppliers(supplierResponse);
      setMaterials(materialResponse.data);
      setWarehouses(warehouseResponse);
      setUnits(unitResponse);
      setQuickDraft((current) => ({
        ...current,
        warehouseId: current.warehouseId || defaultWarehouseId,
        stockUnit: current.stockUnit || defaultUnit
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Alış məlumatları yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(query);
  }, [query.page, query.limit, query.search, query.supplierId, query.paymentType, query.onlyDebtors, query.dateFrom, query.dateTo]);

  const supplierTotals = summary?.supplierTotals ?? [];
  const unitOptions = useMemo(() => getActiveUnits(units), [units]);
  const quickPreview = useMemo(() => calculatePreview(quickDraft), [quickDraft]);

  const updateDraftFromMaterial = (current: PurchaseDraft, materialId: string) => {
    const material = materials.find((item) => item.id === materialId);
    return {
      ...current,
      materialId,
      stockUnit: material?.stockUnit ?? material?.unit ?? current.stockUnit,
      packageUnit: material?.packageUnit ?? current.packageUnit,
      unitsPerPackage:
        material?.defaultUnitsPerPackage != null && !current.unitsPerPackage
          ? String(material.defaultUnitsPerPackage)
          : current.unitsPerPackage
    };
  };

  const resetSupplierDraft = () => {
    setEditingSupplierId(null);
    setSupplierDraft(emptySupplierDraft());
  };

  const refreshAfterCreate = async () => {
    const nextQuery = createDefaultPurchaseQuery(query.limit ?? 20);
    setQuery(nextQuery);
    await load(nextQuery);
  };

  const saveRow = async (id: string, source: PurchaseDraft) => {
    if (!source.supplierId || !source.materialId) {
      toast.warning('Təchizatçı və material vacibdir');
      return;
    }

    setSaving(true);
    try {
      await purchasesClient.update(id, toDto(source));
      toast.success('Alış sətri yeniləndi');
      setEditingId(null);
      setDraft(null);
      await load(query);
    } catch (saveError) {
      toast.error('Alış sətri saxlanmadı', saveError instanceof Error ? saveError.message : 'Xəta baş verdi');
    } finally {
      setSaving(false);
    }
  };

  const saveQuick = async () => {
    if (!quickDraft.supplierId || !quickDraft.materialId) {
      toast.warning('Təchizatçı və material vacibdir');
      return;
    }

    setSaving(true);
    try {
      await purchasesClient.quickCreate(toDto(quickDraft));
      const defaultWarehouseId = warehouses[0]?.id ?? '';
      const defaultUnit = unitOptions[0]?.value ?? defaultUnitValue;
      setQuickDraft(emptyPurchaseDraft(defaultWarehouseId, defaultUnit));
      setQuickOpen(false);
      await refreshAfterCreate();
      toast.success('Alış siyahıya əlavə olundu', 'Yeni alış anbara giriş və təchizatçı borcu ilə birlikdə qeydə alındı.');
    } catch (saveError) {
      toast.error('Alış sətri yaradılmadı', saveError instanceof Error ? saveError.message : 'Xəta baş verdi');
    } finally {
      setSaving(false);
    }
  };

  const saveSupplier = async () => {
    if (!supplierDraft.name.trim()) {
      toast.warning('Təchizatçı adı vacibdir');
      return;
    }

    setSavingSupplier(true);
    try {
      if (editingSupplierId) {
        await purchasesClient.updateSupplier(editingSupplierId, createSupplierDto(supplierDraft) as UpdateSupplierDto);
      } else {
        await purchasesClient.createSupplier(createSupplierDto(supplierDraft));
      }

      toast.success(editingSupplierId ? 'Təchizatçı yeniləndi' : 'Təchizatçı əlavə olundu');
      resetSupplierDraft();
      await load(query);
    } catch (saveError) {
      toast.error('Təchizatçı saxlanmadı', saveError instanceof Error ? saveError.message : 'Xəta baş verdi');
    } finally {
      setSavingSupplier(false);
    }
  };

  const toggleSupplierStatus = async (supplier: SupplierItem, isActive: boolean) => {
    try {
      await purchasesClient.updateSupplier(supplier.id, { isActive });
      toast.success(isActive ? 'Təchizatçı aktiv edildi' : 'Təchizatçı passiv edildi');
      await load(query);
    } catch (toggleError) {
      toast.error('Status yenilənmədi', toggleError instanceof Error ? toggleError.message : 'Xəta baş verdi');
    }
  };

  const removeSupplier = async (supplier: SupplierItem) => {
    try {
      await purchasesClient.removeSupplier(supplier.id);
      toast.success('Təchizatçı silindi');
      await load(query);
    } catch (removeError) {
      toast.error('Təchizatçı silinmədi', removeError instanceof Error ? removeError.message : 'Xəta baş verdi');
    }
  };

  if (loading && !summary) {
    return <LoadingState rows={6} />;
  }

  if (error && !summary) {
    return <ErrorState description={error} onRetry={() => void load(query)} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Alış"
        description="Material alışları, anbara giriş və təchizatçı borcu bir yerdə idarə olunur."
        actions={
          <>
            <Button variant="secondary" onClick={() => setFiltersOpen((current) => !current)}>
              Filtrlər
            </Button>
            <Button variant="secondary" onClick={() => setSupplierModalOpen(true)}>
              Təchizatçılar
            </Button>
            <Button onClick={() => setQuickOpen(true)}>Yeni alış</Button>
          </>
        }
      />

      {error ? <InlineAlert>{error}</InlineAlert> : null}

      <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-4">
        <SummaryBox label="Alış cəmi" value={formatCurrency(summary?.totalPurchaseAmount)} />
        <SummaryBox label="Ödəniş cəmi" value={formatCurrency(summary?.totalPaymentAmount)} />
        <SummaryBox label="Qalıq borc" value={formatCurrency(summary?.totalSupplierDebt)} tone="danger" />
        <SummaryBox label="Borclu təchizatçı" value={String(supplierTotals.filter((item) => item.remainingDebt > 0).length)} />
      </div>

      {filtersOpen ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Filtrlər</h2>
              <p className="text-sm text-slate-500">Siyahını daraltmaq üçün lazım olan filtrləri seçin.</p>
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                const nextQuery = createDefaultPurchaseQuery(query.limit ?? 20);
                setQuery(nextQuery);
              }}
            >
              Təmizlə
            </Button>
          </div>

          <div className="grid gap-3 lg:grid-cols-6">
            <Field label="Axtarış">
              <Input
                value={query.search ?? ''}
                onChange={(event) => setQuery((current) => ({ ...current, search: event.target.value, page: 1 }))}
                placeholder="Material, təchizatçı, qeyd"
              />
            </Field>
            <Field label="Təchizatçı">
              <select
                value={query.supplierId ?? ''}
                onChange={(event) => setQuery((current) => ({ ...current, supplierId: event.target.value, page: 1 }))}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="">Bütün təchizatçılar</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ödəniş növü">
              <select
                value={query.paymentType ?? ''}
                onChange={(event) => setQuery((current) => ({ ...current, paymentType: event.target.value, page: 1 }))}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="">Hamısı</option>
                {Object.entries(salesPaymentTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tarixdən">
              <Input type="date" value={query.dateFrom ?? ''} onChange={(event) => setQuery((current) => ({ ...current, dateFrom: event.target.value, page: 1 }))} />
            </Field>
            <Field label="Tarixə">
              <Input type="date" value={query.dateTo ?? ''} onChange={(event) => setQuery((current) => ({ ...current, dateTo: event.target.value, page: 1 }))} />
            </Field>
            <label className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(query.onlyDebtors)}
                onChange={(event) => setQuery((current) => ({ ...current, onlyDebtors: event.target.checked, page: 1 }))}
              />
              Yalnız borclular
            </label>
          </div>
        </div>
      ) : null}

      {!rows.length && !quickOpen ? (
        <EmptyState
          title="Alış sətri yoxdur"
          description="Yeni alış əlavə etdikdən sonra material anbara avtomatik daxil olacaq."
          actionLabel="Yeni alış"
          onAction={() => setQuickOpen(true)}
        />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {[
                    'Tarix',
                    'Təchizatçı',
                    'Material',
                    'Miqdar',
                    'Qablaşdırma',
                    'Vahid qiymət',
                    'Məbləğ',
                    'Ödəniş',
                    'Qalıq borc',
                    'Ödəniş növü',
                    'Əməliyyat'
                  ].map((header) => (
                    <th key={header} className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em]">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {quickOpen ? (
                  <PurchaseEditRow
                    draft={quickDraft}
                    materials={materials}
                    suppliers={suppliers}
                    warehouses={warehouses}
                    units={unitOptions}
                    saving={saving}
                    onChange={setQuickDraft}
                    onChangeMaterial={(materialId) => setQuickDraft((current) => updateDraftFromMaterial(current, materialId))}
                    onCancel={() => setQuickOpen(false)}
                    onSave={() => void saveQuick()}
                  />
                ) : null}

                {rows.map((row) => {
                  const isEditing = editingId === row.id && draft;
                  const packaging =
                    row.packageQuantity && row.unitsPerPackage
                      ? `${formatNumber(row.packageQuantity)} ${row.packageUnit ?? 'qablaşdırma'} × ${formatNumber(row.unitsPerPackage)}`
                      : '—';

                  return isEditing ? (
                    <PurchaseEditRow
                      key={row.id}
                      draft={draft}
                      materials={materials}
                      suppliers={suppliers}
                      warehouses={warehouses}
                      units={unitOptions}
                      saving={saving}
                      onChange={setDraft}
                      onChangeMaterial={(materialId) => setDraft((current) => (current ? updateDraftFromMaterial(current, materialId) : current))}
                      onCancel={() => {
                        setEditingId(null);
                        setDraft(null);
                      }}
                      onSave={() => void saveRow(row.id, draft)}
                    />
                  ) : (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="px-4 py-3">{formatDateOnly(row.date)}</td>
                      <td className="px-4 py-3 font-medium text-slate-950">{row.supplier?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-950">{row.material?.name ?? '—'}</div>
                        <div className="text-xs text-slate-500">{row.material?.sku ?? 'Kod yoxdur'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{formatNumber(row.totalQuantity ?? row.quantity)}</div>
                        <div className="text-xs text-slate-500">{row.stockUnit ?? row.material?.stockUnit ?? row.material?.unit ?? '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{packaging}</td>
                      <td className="px-4 py-3">{formatCurrency(row.unitPrice)}</td>
                      <td className="px-4 py-3 font-medium text-slate-950">{formatCurrency(row.amount)}</td>
                      <td className="px-4 py-3">{formatCurrency(row.paymentAmount)}</td>
                      <td className={`px-4 py-3 font-semibold ${row.remainingDebt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {formatCurrency(row.remainingDebt)}
                      </td>
                      <td className="px-4 py-3">{getSalesLabel(salesPaymentTypeLabels, row.paymentType)}</td>
                      <td className="px-4 py-3">
                        <Button
                          variant="secondary"
                          className="h-8 rounded-lg px-3 text-xs"
                          onClick={() => {
                            setEditingId(row.id);
                            setDraft(createDraft(row));
                          }}
                        >
                          Düzəliş
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.35fr,1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Təchizatçı borcları</h2>
              <p className="text-sm text-slate-500">Alışlardan yaranan qalıq borclar burada toplanır.</p>
            </div>
            <Button variant="secondary" onClick={() => setSupplierModalOpen(true)}>
              Təchizatçılar
            </Button>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {['Təchizatçı', 'Alış cəmi', 'Ödəniş', 'Qalıq borc'].map((header) => (
                    <th key={header} className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em]">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {supplierTotals.length ? (
                  supplierTotals.map((item) => (
                    <tr key={item.supplierId} className="border-b border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-950">{item.supplierName}</td>
                      <td className="px-4 py-3">{formatCurrency(item.purchaseAmount)}</td>
                      <td className="px-4 py-3">{formatCurrency(item.paymentAmount)}</td>
                      <td className={`px-4 py-3 font-semibold ${item.remainingDebt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {formatCurrency(item.remainingDebt)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8">
                      <EmptyState title="Borclu təchizatçı yoxdur" description="Yeni alışlar yarandıqca borc xülasəsi burada görünəcək." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Bu axın necə işləyir?</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <StepRow title="1. Alış yaradılır" description="Material, qablaşdırma və qiymət daxil edilir." />
            <StepRow title="2. Ümumi say hesablanır" description="Bağlama və vahid sayı əsasında stok miqdarı yaranır." />
            <StepRow title="3. Anbara giriş yazılır" description="purchase_in hərəkəti avtomatik yaradılır." />
            <StepRow title="4. Qiymət yenilənir" description="Materialın son alış qiyməti və orta maya dəyəri yenilənir." />
            <StepRow title="5. Borc yaranır" description="Ödənişdən sonra qalıq borc təchizatçı üzrə saxlanılır." />
          </div>
        </div>
      </div>

      <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={(page) => setQuery((current) => ({ ...current, page }))} />

      <Modal
        open={supplierModalOpen}
        title="Təchizatçılar"
        description="Alış üçün istifadə olunan təchizatçıları buradan idarə edin."
        widthClassName="max-w-4xl"
        onClose={() => {
          setSupplierModalOpen(false);
          resetSupplierDraft();
        }}
      >
        <div className="grid gap-5 lg:grid-cols-[360px,1fr]">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <Field label="Ad">
              <Input value={supplierDraft.name} onChange={(event) => setSupplierDraft((current) => ({ ...current, name: event.target.value }))} />
            </Field>
            <Field label="Telefon">
              <Input value={supplierDraft.phone} onChange={(event) => setSupplierDraft((current) => ({ ...current, phone: event.target.value }))} />
            </Field>
            <Field label="VÖEN">
              <Input value={supplierDraft.taxId} onChange={(event) => setSupplierDraft((current) => ({ ...current, taxId: event.target.value }))} />
            </Field>
            <Field label="Qeyd">
              <Input value={supplierDraft.notes} onChange={(event) => setSupplierDraft((current) => ({ ...current, notes: event.target.value }))} />
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={supplierDraft.isActive} onChange={(event) => setSupplierDraft((current) => ({ ...current, isActive: event.target.checked }))} />
              Aktiv təchizatçı
            </label>
            <div className="flex gap-2">
              <Button onClick={() => void saveSupplier()} disabled={savingSupplier}>
                {savingSupplier ? 'Saxlanılır...' : editingSupplierId ? 'Yenilə' : 'Əlavə et'}
              </Button>
              {editingSupplierId ? (
                <Button variant="secondary" onClick={resetSupplierDraft}>
                  Ləğv et
                </Button>
              ) : null}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {['Ad', 'Telefon', 'VÖEN', 'Status', 'Əməliyyat'].map((header) => (
                    <th key={header} className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em]">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-950">{supplier.name}</td>
                    <td className="px-4 py-3">{supplier.phone ?? '—'}</td>
                    <td className="px-4 py-3">{supplier.taxId ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${supplier.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {supplier.isActive ? 'Aktiv' : 'Passiv'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          className="h-8 rounded-lg px-3 text-xs"
                          onClick={() => {
                            setEditingSupplierId(supplier.id);
                            setSupplierDraft({
                              name: supplier.name,
                              phone: supplier.phone ?? '',
                              taxId: supplier.taxId ?? '',
                              notes: supplier.notes ?? '',
                              isActive: supplier.isActive
                            });
                          }}
                        >
                          Düzəliş
                        </Button>
                        <Button
                          variant="secondary"
                          className="h-8 rounded-lg px-3 text-xs"
                          onClick={() => void toggleSupplierStatus(supplier, !supplier.isActive)}
                        >
                          {supplier.isActive ? 'Passiv et' : 'Aktiv et'}
                        </Button>
                        <Button className="h-8 rounded-lg px-3 text-xs" onClick={() => void removeSupplier(supplier)}>
                          Sil
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function PurchaseEditRow({
  draft,
  materials,
  suppliers,
  warehouses,
  units,
  saving,
  onChange,
  onChangeMaterial,
  onCancel,
  onSave
}: {
  draft: PurchaseDraft;
  materials: InventoryMaterialItem[];
  suppliers: SupplierItem[];
  warehouses: WarehouseItem[];
  units: SettingUnitItem[];
  saving: boolean;
  onChange: (draft: PurchaseDraft) => void;
  onChangeMaterial: (materialId: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const preview = calculatePreview(draft);

  return (
    <tr className="bg-amber-50/60 align-top">
      <td className="px-3 py-3">
        <Input className="h-9 rounded-lg px-2 text-sm" type="date" value={draft.date} onChange={(event) => onChange({ ...draft, date: event.target.value })} />
      </td>
      <td className="px-3 py-3">
        <select
          className="h-9 w-44 rounded-lg border border-slate-200 bg-white px-2 text-sm"
          value={draft.supplierId}
          onChange={(event) => onChange({ ...draft, supplierId: event.target.value })}
        >
          <option value="">Təchizatçı</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-3">
        <select
          className="h-9 w-52 rounded-lg border border-slate-200 bg-white px-2 text-sm"
          value={draft.materialId}
          onChange={(event) => onChangeMaterial(event.target.value)}
        >
          <option value="">Material</option>
          {materials.map((material) => (
            <option key={material.id} value={material.id}>
              {material.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-3">
        <div className="grid gap-2">
          <Input className="h-9 rounded-lg px-2 text-sm" type="number" step="0.0001" value={draft.quantity} onChange={(event) => onChange({ ...draft, quantity: event.target.value })} placeholder="Ümumi say" />
          <select className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm" value={draft.stockUnit} onChange={(event) => onChange({ ...draft, stockUnit: event.target.value })}>
            {units.map((unit) => (
              <option key={unit.id} value={unit.value}>
                {unit.labelAz}
              </option>
            ))}
          </select>
          <div className="text-xs text-slate-500">Hesablanan: {formatNumber(preview.totalQuantity)}</div>
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="grid gap-2">
          <select className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm" value={draft.packageUnit} onChange={(event) => onChange({ ...draft, packageUnit: event.target.value })}>
            <option value="">Qablaşdırma</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.value}>
                {unit.labelAz}
              </option>
            ))}
          </select>
          <Input className="h-9 rounded-lg px-2 text-sm" type="number" step="0.0001" value={draft.unitsPerPackage} onChange={(event) => onChange({ ...draft, unitsPerPackage: event.target.value })} placeholder="Bir qablaşdırmada" />
          <Input className="h-9 rounded-lg px-2 text-sm" type="number" step="0.0001" value={draft.packageQuantity} onChange={(event) => onChange({ ...draft, packageQuantity: event.target.value })} placeholder="Qablaşdırma sayı" />
          <select className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm" value={draft.warehouseId} onChange={(event) => onChange({ ...draft, warehouseId: event.target.value })}>
            <option value="">Anbar</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>
        </div>
      </td>
      <td className="px-3 py-3">
        <Input className="h-9 rounded-lg px-2 text-sm" type="number" step="0.0001" value={draft.unitPrice} onChange={(event) => onChange({ ...draft, unitPrice: event.target.value })} placeholder="Vahid qiyməti" />
      </td>
      <td className="px-3 py-3">
        <Input className="h-9 rounded-lg px-2 text-sm" type="number" step="0.01" value={draft.amount} onChange={(event) => onChange({ ...draft, amount: event.target.value })} placeholder="Məbləğ" />
      </td>
      <td className="px-3 py-3">
        <Input className="h-9 rounded-lg px-2 text-sm" type="number" step="0.01" value={draft.paymentAmount} onChange={(event) => onChange({ ...draft, paymentAmount: event.target.value })} placeholder="Ödəniş" />
      </td>
      <td className="px-3 py-3 font-semibold text-rose-600">{formatCurrency(preview.remainingDebt)}</td>
      <td className="px-3 py-3">
        <select className="h-9 w-32 rounded-lg border border-slate-200 bg-white px-2 text-sm" value={draft.paymentType} onChange={(event) => onChange({ ...draft, paymentType: event.target.value })}>
          {Object.entries(salesPaymentTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-col gap-2">
          <Button className="h-8 rounded-lg px-3 text-xs" onClick={onSave} disabled={saving}>
            {saving ? 'Saxlanılır...' : 'Yadda saxla'}
          </Button>
          <Button className="h-8 rounded-lg px-3 text-xs" variant="secondary" onClick={onCancel}>
            Bağla
          </Button>
        </div>
      </td>
    </tr>
  );
}

function StepRow({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 px-4 py-3">
      <div className="font-medium text-slate-950">{title}</div>
      <div className="mt-1 text-sm text-slate-500">{description}</div>
    </div>
  );
}

function SummaryBox({ label, value, tone }: { label: string; value: string; tone?: 'danger' | 'success' }) {
  const colorClass = tone === 'danger' ? 'text-rose-600' : tone === 'success' ? 'text-emerald-600' : 'text-slate-950';
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className={`mt-2 text-lg font-semibold ${colorClass}`}>{value}</div>
    </div>
  );
}

function InlineAlert({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{children}</div>;
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
