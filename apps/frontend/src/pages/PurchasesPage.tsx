import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Button, Input } from '@bestapp/ui';
import { CheckCircle2, Eye, Package2, PencilLine, Plus, Trash2, XCircle } from 'lucide-react';
import type { CreatePurchaseDto, Purchase, PurchaseCurrencyCode, PurchaseItem, PurchaseQuantityMode, PurchaseStatus, UpdatePurchaseDto } from '@bestapp/shared';
import { materialsClient } from '../shared/api/materials';
import { purchasesClient } from '../shared/api/purchases';
import { ErrorState, EmptyState, LoadingState, PageHeader, Pagination } from '../shared/components';
import { useToast } from '../shared/toast/toast-context';
import type { MaterialListItem } from '../shared/materials';

type PurchaseLineDraft = {
  materialId: string;
  quantityMode: PurchaseQuantityMode;
  quantity: string;
  unitPrice: string;
  notes: string;
};

type PurchaseFormState = {
  purchaseDate: string;
  supplierName: string;
  invoiceNo: string;
  currencyCode: PurchaseCurrencyCode;
  exchangeRate: string;
  notes: string;
  status: PurchaseStatus;
  items: PurchaseLineDraft[];
};

type Mode = 'create' | 'edit' | 'view';

const CURRENCY_OPTIONS: PurchaseCurrencyCode[] = ['AZN', 'USD', 'EUR', 'TRY'];
const QUANTITY_MODE_OPTIONS: Array<{ value: PurchaseQuantityMode; label: string }> = [
  { value: 'base', label: 'Əsas vahid' },
  { value: 'package', label: 'Qablaşdırma' },
  { value: 'pallet', label: 'Palet' }
];

function toDateInput(value?: string | null) {
  return value ? value.slice(0, 10) : new Date().toISOString().slice(0, 10);
}

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: number | null | undefined, digits = 2) {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }

  return new Intl.NumberFormat('az-AZ', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value);
}

function formatInteger(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }

  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value).replace(/,/g, ' ');
}

function formatCurrency(value: number, currencyCode: PurchaseCurrencyCode) {
  return new Intl.NumberFormat('az-AZ', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 2
  }).format(value);
}

function emptyLine(materialId = ''): PurchaseLineDraft {
  return {
    materialId,
    quantityMode: 'base',
    quantity: '',
    unitPrice: '',
    notes: ''
  };
}

function emptyFormState(materialId = ''): PurchaseFormState {
  return {
    purchaseDate: toDateInput(),
    supplierName: '',
    invoiceNo: '',
    currencyCode: 'AZN',
    exchangeRate: '1',
    notes: '',
    status: 'draft',
    items: [emptyLine(materialId)]
  };
}

function materialBaseUnit(material?: MaterialListItem | null) {
  return material?.stockUnit || material?.unit || '—';
}

function getModeOptions(material?: MaterialListItem | null) {
  return QUANTITY_MODE_OPTIONS.map((option) => ({
    ...option,
    disabled:
      option.value === 'package'
        ? material?.defaultUnitsPerPackage == null
        : option.value === 'pallet'
          ? material?.defaultUnitsPerPallet == null
          : false
  }));
}

function calculateLine(material: MaterialListItem | null | undefined, line: PurchaseLineDraft) {
  const quantity = toNumber(line.quantity);
  const unitPrice = toNumber(line.unitPrice);
  const baseUnit = materialBaseUnit(material);

  if (!material || !line.materialId || quantity <= 0) {
    return { baseQuantity: null, lineTotal: null, baseUnit };
  }

  let baseQuantity: number | null = null;

  if (line.quantityMode === 'base') {
    baseQuantity = quantity;
  } else if (line.quantityMode === 'package' && material.defaultUnitsPerPackage != null) {
    baseQuantity = quantity * material.defaultUnitsPerPackage;
  } else if (line.quantityMode === 'pallet' && material.defaultUnitsPerPallet != null) {
    baseQuantity = quantity * material.defaultUnitsPerPallet;
  }

  return {
    baseQuantity,
    lineTotal: quantity * unitPrice,
    baseUnit
  };
}

function toLineDraft(item: PurchaseItem): PurchaseLineDraft {
  return {
    materialId: item.materialId,
    quantityMode: item.quantityMode,
    quantity: String(item.quantity),
    unitPrice: String(item.unitPrice),
    notes: item.notes ?? ''
  };
}

function toFormState(purchase?: Purchase | null): PurchaseFormState {
  if (!purchase) {
    return emptyFormState();
  }

  return {
    purchaseDate: toDateInput(purchase.purchaseDate),
    supplierName: purchase.supplierName,
    invoiceNo: purchase.invoiceNo ?? '',
    currencyCode: purchase.currencyCode,
    exchangeRate: String(purchase.exchangeRate ?? 1),
    notes: purchase.notes ?? '',
    status: purchase.status,
    items: purchase.items.length > 0 ? purchase.items.map(toLineDraft) : [emptyLine()]
  };
}

function buildPayload(form: PurchaseFormState, materials: MaterialListItem[]): CreatePurchaseDto {
  const materialMap = new Map(materials.map((material) => [material.id, material]));

  return {
    purchaseDate: form.purchaseDate ? new Date(`${form.purchaseDate}T00:00:00`).toISOString() : undefined,
    supplierName: form.supplierName.trim(),
    invoiceNo: form.invoiceNo.trim() || undefined,
    currencyCode: form.currencyCode,
    exchangeRate: toNumber(form.exchangeRate) || 1,
    notes: form.notes.trim() || undefined,
    status: form.status,
    items: form.items
      .filter((item) => item.materialId.trim())
      .map((item) => {
        const material = materialMap.get(item.materialId);
        const quantity = toNumber(item.quantity);
        const unitPrice = toNumber(item.unitPrice);

        if (!material) {
          throw new Error('Material seçin');
        }

        if (quantity <= 0) {
          throw new Error('Miqdar 0-dan böyük olmalıdır');
        }

        if (unitPrice < 0) {
          throw new Error('Vahid qiymət 0 və ya daha böyük olmalıdır');
        }

        if (item.quantityMode === 'package' && material.defaultUnitsPerPackage == null) {
          throw new Error('Seçilmiş material üçün qablaşdırma məlumatı yoxdur');
        }

        if (item.quantityMode === 'pallet' && material.defaultUnitsPerPallet == null) {
          throw new Error('Seçilmiş material üçün palet məlumatı yoxdur');
        }

        return {
          materialId: item.materialId,
          quantityMode: item.quantityMode,
          quantity,
          unitPrice,
          notes: item.notes.trim() || undefined
        };
      })
  };
}

function ModalShell({
  title,
  description,
  children,
  footer,
  onClose
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
              {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
            </div>
            <button
              type="button"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-500 transition hover:bg-slate-50"
              onClick={onClose}
            >
              Bağla
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
        <div className="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-4">{footer}</div>
      </div>
    </div>
  );
}

function Badge({ status }: { status: PurchaseStatus }) {
  const classes =
    status === 'confirmed'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'cancelled'
        ? 'bg-rose-50 text-rose-700'
        : 'bg-slate-100 text-slate-600';

  const labels: Record<PurchaseStatus, string> = {
    draft: 'Qaralama',
    confirmed: 'Təsdiqlənib',
    cancelled: 'Ləğv edilib'
  };

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>{labels[status]}</span>;
}

export function PurchasesPage() {
  const toast = useToast();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [materials, setMaterials] = useState<MaterialListItem[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | PurchaseStatus>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('create');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<PurchaseFormState>(emptyFormState());

  const selectedMaterials = useMemo(() => materials, [materials]);
  const editingPurchase = useMemo(
    () => purchases.find((purchase) => purchase.id === editingId) ?? null,
    [editingId, purchases]
  );

  const loadData = async (nextPage = page, nextLimit = limit, nextSearch = search, nextStatus = status) => {
    setLoading(true);
    setError(null);

    try {
      const [purchaseResponse, materialResponse] = await Promise.all([
        purchasesClient.list({
          page: nextPage,
          limit: nextLimit,
          search: nextSearch || undefined,
          status: nextStatus
        }),
        materialsClient.list({
          page: 1,
          limit: 500
        })
      ]);

      setPurchases(purchaseResponse.data);
      setTotalPages(purchaseResponse.meta.totalPages);
      setTotalItems(purchaseResponse.meta.total);
      setMaterials(materialResponse.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Alış məlumatları yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData(page, limit, search, status);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [page, limit, search, status]);

  const refresh = async () => {
    await loadData(page, limit, search, status);
  };

  const openCreate = () => {
    setMode('create');
    setEditingId(null);
    setFormState(emptyFormState());
    setModalOpen(true);
  };

  const openView = (purchase: Purchase) => {
    setMode('view');
    setEditingId(purchase.id);
    setFormState(toFormState(purchase));
    setModalOpen(true);
  };

  const openEdit = (purchase: Purchase) => {
    setMode('edit');
    setEditingId(purchase.id);
    setFormState(toFormState(purchase));
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setFormState(emptyFormState());
  };

  const addLine = () => {
    setFormState((current) => ({
      ...current,
      items: [...current.items, emptyLine()]
    }));
  };

  const removeLine = (index: number) => {
    setFormState((current) => ({
      ...current,
      items: current.items.length > 1 ? current.items.filter((_, currentIndex) => currentIndex !== index) : current.items
    }));
  };

  const savePurchase = async () => {
    if (!formState.supplierName.trim()) {
      toast.warning('Təchizatçı adını daxil edin');
      return;
    }

    if (formState.items.every((item) => !item.materialId.trim())) {
      toast.warning('Ən azı 1 material seçin');
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload(formState, selectedMaterials);

      if (mode === 'edit' && editingId) {
        await purchasesClient.update(editingId, payload as UpdatePurchaseDto);
        toast.success('Alış yeniləndi');
      } else {
        await purchasesClient.create(payload);
        toast.success('Alış yaradıldı');
      }

      closeModal();
      await refresh();
    } catch (saveError) {
      toast.error(
        mode === 'edit' ? 'Alış yenilənmədi' : 'Alış yaradılmadı',
        saveError instanceof Error ? saveError.message : 'Xəta baş verdi'
      );
    } finally {
      setSaving(false);
    }
  };

  const removePurchase = async (purchase: Purchase) => {
    if (!window.confirm('Bu alış silinsin?')) {
      return;
    }

    try {
      await purchasesClient.remove(purchase.id);
      toast.success('Alış silindi');
      await refresh();
    } catch (removeError) {
      toast.error('Alış silinmədi', removeError instanceof Error ? removeError.message : 'Xəta baş verdi');
    }
  };

  const confirmPurchase = async (purchase: Purchase) => {
    try {
      await purchasesClient.confirm(purchase.id);
      toast.success('Alış təsdiqləndi');
      await refresh();
    } catch (confirmError) {
      toast.error('Alış təsdiqlənmədi', confirmError instanceof Error ? confirmError.message : 'Xəta baş verdi');
    }
  };

  const cancelPurchase = async (purchase: Purchase) => {
    try {
      await purchasesClient.cancel(purchase.id);
      toast.success('Alış ləğv edildi');
      await refresh();
    } catch (cancelError) {
      toast.error('Alış ləğv edilmədi', cancelError instanceof Error ? cancelError.message : 'Xəta baş verdi');
    }
  };

  const currentPurchase = editingPurchase ?? (editingId ? purchases.find((purchase) => purchase.id === editingId) ?? null : null);
  const modalReadOnly = mode === 'view' || (mode === 'edit' && currentPurchase?.status !== 'draft');
  const footer = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-slate-500">
        {mode === 'view'
          ? 'Yalnız baxış rejimi'
          : modalReadOnly
            ? 'Təsdiqlənmiş alış redaktə edilə bilməz'
            : 'Dəyişiklikləri yadda saxlayın'}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={closeModal} disabled={saving}>
          Bağla
        </Button>
        {!modalReadOnly ? (
          <Button onClick={() => void savePurchase()} disabled={saving}>
            {saving ? 'Yadda saxlanılır...' : 'Yadda saxla'}
          </Button>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alış"
        description="Materiallar üçün alış sənədlərini burada yaradın, təsdiqləyin və izləyin."
        actions={
          <Button onClick={openCreate}>
            <span className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Yeni alış
            </span>
          </Button>
        }
      />

      <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <label className="block space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Axtarış</span>
          <Input
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
            placeholder="Alış №, təchizatçı və ya faktura №"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Status</span>
          <select
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value as 'all' | PurchaseStatus);
            }}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
          >
            <option value="all">Hamısı</option>
            <option value="draft">Qaralama</option>
            <option value="confirmed">Təsdiqlənib</option>
            <option value="cancelled">Ləğv edilib</option>
          </select>
        </label>
      </div>

      {loading ? (
        <LoadingState rows={4} />
      ) : error ? (
        <ErrorState title="Alışlar yüklənmədi" description={error} onRetry={() => void loadData(page, limit, search, status)} />
      ) : purchases.length === 0 ? (
        <EmptyState
          title="Alış tapılmadı"
          description="Yeni alış yaradaraq material daxilolmalarını qeyd edin."
          icon={Package2}
          actionLabel="Yeni alış"
          onAction={openCreate}
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    {['Alış №', 'Tarix', 'Təchizatçı', 'Faktura №', 'Status', 'Cəmi', 'Əməliyyatlar'].map((header) => (
                      <th
                        key={header}
                        className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em]"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => (
                    <tr key={purchase.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-4 py-3 font-medium text-slate-950">{purchase.purchaseNo}</td>
                      <td className="px-4 py-3">{toDateInput(purchase.purchaseDate)}</td>
                      <td className="px-4 py-3">{purchase.supplierName}</td>
                      <td className="px-4 py-3">{purchase.invoiceNo || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge status={purchase.status} />
                      </td>
                      <td className="px-4 py-3">{formatCurrency(purchase.total, purchase.currencyCode)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" className="h-9 px-3" onClick={() => openView(purchase)}>
                            <span className="inline-flex items-center gap-2">
                              <Eye className="h-4 w-4" />
                              Bax
                            </span>
                          </Button>
                          <Button
                            variant="secondary"
                            className="h-9 px-3"
                            onClick={() => openEdit(purchase)}
                            disabled={purchase.status !== 'draft'}
                          >
                            <span className="inline-flex items-center gap-2">
                              <PencilLine className="h-4 w-4" />
                              Redaktə et
                            </span>
                          </Button>
                          <Button
                            variant="ghost"
                            className="h-9 px-3 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            onClick={() => void removePurchase(purchase)}
                          >
                            <span className="inline-flex items-center gap-2">
                              <Trash2 className="h-4 w-4" />
                              Sil
                            </span>
                          </Button>
                          <Button
                            variant="secondary"
                            className="h-9 px-3"
                            onClick={() => void confirmPurchase(purchase)}
                            disabled={purchase.status !== 'draft'}
                          >
                            <span className="inline-flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4" />
                              Təsdiqlə
                            </span>
                          </Button>
                          <Button
                            variant="secondary"
                            className="h-9 px-3"
                            onClick={() => void cancelPurchase(purchase)}
                            disabled={purchase.status === 'cancelled'}
                          >
                            <span className="inline-flex items-center gap-2">
                              <XCircle className="h-4 w-4" />
                              Ləğv et
                            </span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

          <div className="text-sm text-slate-500">
            Cəmi {totalItems} alış · Səhifə {page} / {totalPages}
          </div>
        </div>
      )}

      {modalOpen ? (
        <ModalShell
          title={mode === 'create' ? 'Yeni alış' : mode === 'edit' ? 'Alışı redaktə et' : 'Alış məlumatı'}
          description="Başlıq məlumatları və material sətirlərini burada daxil edin."
          onClose={closeModal}
          footer={footer}
        >
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Tarix</span>
                <Input
                  type="date"
                  value={formState.purchaseDate}
                  onChange={(event) => setFormState((current) => ({ ...current, purchaseDate: event.target.value }))}
                  disabled={modalReadOnly}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Təchizatçı</span>
                <Input
                  value={formState.supplierName}
                  onChange={(event) => setFormState((current) => ({ ...current, supplierName: event.target.value }))}
                  disabled={modalReadOnly}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Faktura №</span>
                <Input
                  value={formState.invoiceNo}
                  onChange={(event) => setFormState((current) => ({ ...current, invoiceNo: event.target.value }))}
                  disabled={modalReadOnly}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Valyuta</span>
                <select
                  value={formState.currencyCode}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, currencyCode: event.target.value as PurchaseCurrencyCode }))
                  }
                  disabled={modalReadOnly}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-50"
                >
                  {CURRENCY_OPTIONS.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Məzənnə</span>
                <Input
                  type="number"
                  step="0.0001"
                  value={formState.exchangeRate}
                  onChange={(event) => setFormState((current) => ({ ...current, exchangeRate: event.target.value }))}
                  disabled={modalReadOnly}
                />
              </label>

              <label className="block space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Qeyd</span>
                <textarea
                  rows={3}
                  value={formState.notes}
                  onChange={(event) => setFormState((current) => ({ ...current, notes: event.target.value }))}
                  disabled={modalReadOnly}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-50"
                />
              </label>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-700">Alış sətirləri</div>
                  <div className="mt-1 text-sm text-slate-500">Materialı seçin və miqdar tipinə görə hesablamanı aparın.</div>
                </div>
                {!modalReadOnly ? (
                  <Button variant="secondary" className="h-9 px-3" onClick={addLine}>
                    <span className="inline-flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Sətir əlavə et
                    </span>
                  </Button>
                ) : null}
              </div>

              <div className="mt-4 space-y-4">
                {formState.items.map((line, index) => {
                  const material = selectedMaterials.find((item) => item.id === line.materialId) ?? null;
                  const calculated = calculateLine(material, line);
                  const modeOptions = getModeOptions(material);
                  return (
                    <div key={`${index}-${line.materialId || 'new'}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="grid gap-4 lg:grid-cols-6">
                        <label className="block space-y-2 lg:col-span-2">
                          <span className="text-sm font-medium text-slate-700">Material</span>
                          <select
                            value={line.materialId}
                            onChange={(event) => {
                              const materialId = event.target.value;
                              const material = selectedMaterials.find((item) => item.id === materialId) ?? null;
                              setFormState((current) => {
                                const nextItems = [...current.items];
                                const currentLine = nextItems[index];
                                const allowedMode =
                                  currentLine.quantityMode === 'package' && material?.defaultUnitsPerPackage == null
                                    ? 'base'
                                    : currentLine.quantityMode === 'pallet' && material?.defaultUnitsPerPallet == null
                                      ? 'base'
                                      : currentLine.quantityMode;
                                nextItems[index] = {
                                  ...currentLine,
                                  materialId,
                                  quantityMode: allowedMode
                                };
                                return { ...current, items: nextItems };
                              });
                            }}
                            disabled={modalReadOnly}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-50"
                          >
                            <option value="">Material seçin</option>
                            {selectedMaterials.map((materialItem) => (
                              <option key={materialItem.id} value={materialItem.id}>
                                {materialItem.materialNo} · {materialItem.name}
                                {!materialItem.isActive ? ' (deaktiv)' : ''}
                              </option>
                            ))}
                          </select>
                          {material ? (
                            <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                              <div>Əsas vahid: {materialBaseUnit(material)}</div>
                              <div>
                                1 {material.packageUnit || '—'}:{' '}
                                {material.defaultUnitsPerPackage != null ? `${formatInteger(material.defaultUnitsPerPackage)} ${materialBaseUnit(material)}` : '—'}
                              </div>
                              <div>
                                1 {material.palletUnit || '—'}:{' '}
                                {material.defaultUnitsPerPallet != null ? `${formatInteger(material.defaultUnitsPerPallet)} ${materialBaseUnit(material)}` : '—'}
                              </div>
                            </div>
                          ) : null}
                        </label>

                        <label className="block space-y-2">
                          <span className="text-sm font-medium text-slate-700">Miqdar tipi</span>
                          <select
                            value={line.quantityMode}
                            onChange={(event) =>
                              setFormState((current) => {
                                const nextItems = [...current.items];
                                nextItems[index] = { ...nextItems[index], quantityMode: event.target.value as PurchaseQuantityMode };
                                return { ...current, items: nextItems };
                              })
                            }
                            disabled={modalReadOnly}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-50"
                          >
                            {modeOptions.map((option) => (
                              <option key={option.value} value={option.value} disabled={option.disabled}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block space-y-2">
                          <span className="text-sm font-medium text-slate-700">Miqdar</span>
                          <Input
                            type="number"
                            step="0.0001"
                            value={line.quantity}
                            onChange={(event) =>
                              setFormState((current) => {
                                const nextItems = [...current.items];
                                nextItems[index] = { ...nextItems[index], quantity: event.target.value };
                                return { ...current, items: nextItems };
                              })
                            }
                            disabled={modalReadOnly}
                          />
                        </label>

                        <label className="block space-y-2">
                          <span className="text-sm font-medium text-slate-700">Vahid qiymət</span>
                          <Input
                            type="number"
                            step="0.0001"
                            value={line.unitPrice}
                            onChange={(event) =>
                              setFormState((current) => {
                                const nextItems = [...current.items];
                                nextItems[index] = { ...nextItems[index], unitPrice: event.target.value };
                                return { ...current, items: nextItems };
                              })
                            }
                            disabled={modalReadOnly}
                          />
                        </label>

                        <div className="space-y-2">
                          <span className="text-sm font-medium text-slate-700">Əsas miqdar</span>
                          <div className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                            {calculated.baseQuantity != null ? `${formatInteger(calculated.baseQuantity)} ${calculated.baseUnit}` : '—'}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <span className="text-sm font-medium text-slate-700">Cəmi</span>
                          <div className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                            {calculated.lineTotal != null ? formatCurrency(calculated.lineTotal, formState.currencyCode) : '—'}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end">
                        <label className="block flex-1 space-y-2">
                          <span className="text-sm font-medium text-slate-700">Qeyd</span>
                          <Input
                            value={line.notes}
                            onChange={(event) =>
                              setFormState((current) => {
                                const nextItems = [...current.items];
                                nextItems[index] = { ...nextItems[index], notes: event.target.value };
                                return { ...current, items: nextItems };
                              })
                            }
                            disabled={modalReadOnly}
                          />
                        </label>

                        {!modalReadOnly ? (
                          <Button
                            variant="ghost"
                            className="h-11 px-4 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            onClick={() => removeLine(index)}
                            disabled={formState.items.length <= 1}
                          >
                            <span className="inline-flex items-center gap-2">
                              <Trash2 className="h-4 w-4" />
                              Sətiri sil
                            </span>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <div className="text-sm text-slate-500">Sətir sayı</div>
                  <div className="text-lg font-semibold text-slate-950">{formState.items.filter((item) => item.materialId).length}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Cəmi məbləğ</div>
                  <div className="text-lg font-semibold text-slate-950">
                    {formatCurrency(
                      formState.items.reduce((sum, item) => {
                        const material = selectedMaterials.find((candidate) => candidate.id === item.materialId) ?? null;
                        const line = calculateLine(material, item);
                        return sum + (line.lineTotal ?? 0);
                      }, 0),
                      formState.currencyCode
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Məzənnə</div>
                  <div className="text-lg font-semibold text-slate-950">{formatNumber(toNumber(formState.exchangeRate), 4)}</div>
                </div>
              </div>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}
