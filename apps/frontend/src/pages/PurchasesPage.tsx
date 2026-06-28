import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Button, Input } from '@bestapp/ui';
import { CheckCircle2, Eye, Package2, PencilLine, Plus, Trash2, XCircle } from 'lucide-react';
import type {
  CreatePurchaseDto,
  Purchase,
  PurchaseItem,
  PurchaseQuantityMode,
  PurchaseStatus,
  WarehouseItem,
  UpdatePurchaseDto
} from '@bestapp/shared';
import { materialsClient } from '../shared/api/materials';
import { purchasesClient } from '../shared/api/purchases';
import { suppliersClient } from '../shared/api/suppliers';
import { warehousesClient } from '../shared/api/warehouses';
import { ErrorState, EmptyState, LoadingState, PageHeader, Pagination } from '../shared/components';
import { useToast } from '../shared/toast/toast-context';
import type { MaterialListItem } from '../shared/materials';
import type { SupplierItem } from '@bestapp/shared';

type LineDraft = {
  materialId: string;
  quantityMode: PurchaseQuantityMode;
  quantity: string;
  unitPrice: string;
  vatRate: '0' | '18';
  notes: string;
};

type FormState = {
  purchaseDate: string;
  supplierName: string;
  warehouseId: string;
  notes: string;
  status: PurchaseStatus;
  items: LineDraft[];
};

type Mode = 'create' | 'edit' | 'view';

const QUANTITY_MODE_OPTIONS: Array<{ value: PurchaseQuantityMode; label: string }> = [
  { value: 'base', label: 'Əsas vahid' },
  { value: 'package', label: 'Qablaşdırma' },
  { value: 'pallet', label: 'Palet' }
];

const VAT_OPTIONS: Array<{ value: '0' | '18'; label: string }> = [
  { value: '0', label: 'ƏDV-siz' },
  { value: '18', label: 'ƏDV-li 18%' }
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

function formatCurrency(value: number, currencyCode = 'AZN') {
  return new Intl.NumberFormat('az-AZ', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 2
  }).format(value);
}

function emptyLine(): LineDraft {
  return {
    materialId: '',
    quantityMode: 'base',
    quantity: '',
    unitPrice: '',
    vatRate: '0',
    notes: ''
  };
}

function emptyFormState(warehouseId = ''): FormState {
  return {
    purchaseDate: toDateInput(),
    supplierName: '',
    warehouseId,
    notes: '',
    status: 'draft',
    items: []
  };
}

function materialBaseUnit(material?: MaterialListItem | null) {
  return material?.stockUnit || material?.unit || '—';
}

function calculateLine(material: MaterialListItem | null | undefined, line: LineDraft) {
  const quantity = toNumber(line.quantity);
  const unitPrice = toNumber(line.unitPrice);
  const vatRate = toNumber(line.vatRate);

  let baseQuantity = null as number | null;

  if (material && quantity > 0) {
    if (line.quantityMode === 'base') {
      baseQuantity = quantity;
    } else if (line.quantityMode === 'package' && material.defaultUnitsPerPackage != null) {
      baseQuantity = quantity * material.defaultUnitsPerPackage;
    } else if (line.quantityMode === 'pallet' && material.defaultUnitsPerPallet != null) {
      baseQuantity = quantity * material.defaultUnitsPerPallet;
    }
  }

  const netAmount = quantity > 0 ? quantity * unitPrice : 0;
  const vatAmount = netAmount * (vatRate / 100);
  const lineTotal = netAmount + vatAmount;

  return {
    baseQuantity,
    vatAmount,
    netAmount,
    lineTotal,
    baseUnit: materialBaseUnit(material)
  };
}

function toLineDraft(item: PurchaseItem): LineDraft {
  return {
    materialId: item.materialId,
    quantityMode: item.quantityMode,
    quantity: String(item.quantity),
    unitPrice: String(item.unitPrice),
    vatRate: String(item.vatRate) === '18' ? '18' : '0',
    notes: item.notes ?? ''
  };
}

function toFormState(purchase?: Purchase | null): FormState {
  if (!purchase) {
    return emptyFormState();
  }

  return {
    purchaseDate: toDateInput(purchase.purchaseDate),
    supplierName: purchase.supplierName,
    warehouseId: purchase.warehouseId ?? '',
    notes: purchase.notes ?? '',
    status: purchase.status,
    items: purchase.items.map(toLineDraft)
  };
}

function buildPayload(form: FormState, materials: MaterialListItem[], defaultWarehouseId?: string): CreatePurchaseDto {
  const materialMap = new Map(materials.map((material) => [material.id, material]));

  const items = form.items.map((line) => {
    const material = materialMap.get(line.materialId);
    if (!material) {
      throw new Error('Material seçin');
    }

    const quantity = toNumber(line.quantity);
    const unitPrice = toNumber(line.unitPrice);
    const vatRate = line.vatRate === '18' ? 18 : 0;

    if (quantity <= 0) {
      throw new Error('Miqdar 0-dan böyük olmalıdır');
    }

    if (unitPrice < 0) {
      throw new Error('Vahid qiymət 0 və ya daha böyük olmalıdır');
    }

    if (line.quantityMode === 'package' && material.defaultUnitsPerPackage == null) {
      throw new Error('Seçilmiş material üçün qablaşdırma məlumatı yoxdur');
    }

    if (line.quantityMode === 'pallet' && material.defaultUnitsPerPallet == null) {
      throw new Error('Seçilmiş material üçün palet məlumatı yoxdur');
    }

    return {
      materialId: line.materialId,
      quantityMode: line.quantityMode,
      quantity,
      unitPrice,
      vatRate,
      notes: line.notes.trim() || undefined
    };
  });

  return {
    purchaseDate: form.purchaseDate ? new Date(`${form.purchaseDate}T00:00:00`).toISOString() : undefined,
    supplierName: form.supplierName.trim(),
    warehouseId: form.warehouseId || defaultWarehouseId || undefined,
    notes: form.notes.trim() || undefined,
    status: form.status,
    items
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
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-slate-950/70 px-4 py-6 backdrop-blur-xl sm:py-8">
      <div className="mt-0 flex max-h-[calc(100dvh-48px)] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl sm:mt-auto sm:mb-auto">
        <div className="border-b border-slate-200 bg-white/90 px-6 py-5 backdrop-blur-xl">
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
        <div className="sticky bottom-0 shrink-0 border-t border-slate-200 bg-white/90 px-6 py-4 backdrop-blur-xl">{footer}</div>
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
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
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
  const [formState, setFormState] = useState<FormState>(emptyFormState());
  const [lineDraft, setLineDraft] = useState<LineDraft>(emptyLine());
  const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [supplierSaving, setSupplierSaving] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: '', phone: '', email: '', taxId: '' });

  const selectedMaterials = useMemo(() => materials, [materials]);
  const defaultWarehouseId = useMemo(() => warehouses[0]?.id ?? '', [warehouses]);
  const editingPurchase = useMemo(() => purchases.find((purchase) => purchase.id === editingId) ?? null, [editingId, purchases]);
  const selectedMaterial = useMemo(
    () => selectedMaterials.find((material) => material.id === lineDraft.materialId) ?? null,
    [lineDraft.materialId, selectedMaterials]
  );
  const selectedSupplierId = useMemo(
    () => suppliers.find((supplier) => supplier.name === formState.supplierName)?.id ?? '',
    [formState.supplierName, suppliers]
  );
  const linePreview = useMemo(() => calculateLine(selectedMaterial, lineDraft), [selectedMaterial, lineDraft]);

  const loadData = async (nextPage = page, nextLimit = limit, nextSearch = search, nextStatus = status) => {
    setLoading(true);
    setError(null);

    try {
      const [purchaseResponse, materialResponse, supplierResponse, warehouseResponse] = await Promise.all([
        purchasesClient.list({
          page: nextPage,
          limit: nextLimit,
          search: nextSearch || undefined,
          status: nextStatus
        }),
        materialsClient.list({
          page: 1,
          limit: 200,
          status: 'active'
        }),
        suppliersClient.list({ page: 1, limit: 200, status: 'active' }),
        warehousesClient.list()
      ]);

      setPurchases(purchaseResponse.data);
      setTotalPages(purchaseResponse.meta.totalPages);
      setTotalItems(purchaseResponse.meta.total);
      setMaterials(materialResponse.data);
      setSuppliers(supplierResponse.data);
      setWarehouses(warehouseResponse);
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
    setFormState(emptyFormState(defaultWarehouseId));
    setLineDraft(emptyLine());
    setEditingLineIndex(null);
    setModalOpen(true);
  };

  const openView = (purchase: Purchase) => {
    setMode('view');
    setEditingId(purchase.id);
    setFormState(toFormState(purchase));
    setLineDraft(emptyLine());
    setEditingLineIndex(null);
    setModalOpen(true);
  };

  const openEdit = (purchase: Purchase) => {
    setMode('edit');
    setEditingId(purchase.id);
    setFormState(toFormState(purchase));
    setLineDraft(emptyLine());
    setEditingLineIndex(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setFormState(emptyFormState(defaultWarehouseId));
    setLineDraft(emptyLine());
    setEditingLineIndex(null);
  };

  const openSupplierModal = () => {
    setSupplierForm({ name: '', phone: '', email: '', taxId: '' });
    setSupplierModalOpen(true);
  };

  const closeSupplierModal = () => {
    setSupplierModalOpen(false);
    setSupplierForm({ name: '', phone: '', email: '', taxId: '' });
  };

  const saveSupplier = async () => {
    if (!supplierForm.name.trim()) {
      toast.warning('Təchizatçı adı daxil edin');
      return;
    }

    setSupplierSaving(true);
    try {
      const created = await suppliersClient.create({
        name: supplierForm.name.trim(),
        phone: supplierForm.phone.trim() || undefined,
        email: supplierForm.email.trim() || undefined,
        taxId: supplierForm.taxId.trim() || undefined
      });

      setSuppliers((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setFormState((current) => ({ ...current, supplierName: created.name }));
      toast.success('Təchizatçı yaradıldı');
      closeSupplierModal();
    } catch (saveError) {
      toast.error('Təchizatçı yaradılmadı', saveError instanceof Error ? saveError.message : 'Xəta baş verdi');
    } finally {
      setSupplierSaving(false);
    }
  };

  const savePurchase = async () => {
    if (!formState.supplierName.trim()) {
      toast.warning('Təchizatçı adını daxil edin');
      return;
    }

    if (formState.items.length === 0) {
      toast.warning('Ən azı 1 material əlavə edin');
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload(formState, selectedMaterials, defaultWarehouseId);

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

  const addOrUpdateLine = () => {
    try {
      const material = selectedMaterials.find((item) => item.id === lineDraft.materialId) ?? null;
      if (!material) {
        toast.warning('Material seçin');
        return;
      }

      const quantity = toNumber(lineDraft.quantity);
      const unitPrice = toNumber(lineDraft.unitPrice);

      if (quantity <= 0) {
        toast.warning('Miqdar 0-dan böyük olmalıdır');
        return;
      }

      if (unitPrice < 0) {
        toast.warning('Vahid qiymət 0 və ya daha böyük olmalıdır');
        return;
      }

      if (lineDraft.quantityMode === 'package' && material.defaultUnitsPerPackage == null) {
        toast.warning('Bu material üçün qablaşdırma məlumatı yoxdur');
        return;
      }

      if (lineDraft.quantityMode === 'pallet' && material.defaultUnitsPerPallet == null) {
        toast.warning('Bu material üçün palet məlumatı yoxdur');
        return;
      }

      setFormState((current) => {
        const nextItems = [...current.items];

        if (editingLineIndex != null && nextItems[editingLineIndex]) {
          nextItems[editingLineIndex] = lineDraft;
        } else {
          nextItems.push(lineDraft);
        }

        return { ...current, items: nextItems };
      });

      setLineDraft(emptyLine());
      setEditingLineIndex(null);
    } catch (error_) {
      toast.error('Sətir əlavə olunmadı', error_ instanceof Error ? error_.message : 'Xəta baş verdi');
    }
  };

  const editLine = (index: number) => {
    const row = formState.items[index];
    if (!row) return;
    setLineDraft(row);
    setEditingLineIndex(index);
  };

  const deleteLine = (index: number) => {
    setFormState((current) => ({
      ...current,
      items: current.items.filter((_, currentIndex) => currentIndex !== index)
    }));

    if (editingLineIndex === index) {
      setLineDraft(emptyLine());
      setEditingLineIndex(null);
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
      toast.success('Alış təsdiqləndi və anbara daxil edildi');
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

  const purchaseSubtotal = formState.items.reduce((sum, line) => {
    const material = selectedMaterials.find((item) => item.id === line.materialId) ?? null;
    return sum + calculateLine(material, line).netAmount;
  }, 0);

  const purchaseVatTotal = formState.items.reduce((sum, line) => {
    const material = selectedMaterials.find((item) => item.id === line.materialId) ?? null;
    return sum + calculateLine(material, line).vatAmount;
  }, 0);

  const purchaseTotal = purchaseSubtotal + purchaseVatTotal;

  const footer = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-slate-500">
        {mode === 'view'
          ? 'Yalnız baxış rejimi'
          : modalReadOnly
            ? 'Təsdiqlənmiş alış redaktə edilə bilməz'
            : 'Materialı seçin, məlumatı doldurun və “Əlavə et” basın.'}
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
        description="Alış qaimələri burada yaradılır, təsdiqlənir və izlənir."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={openSupplierModal}>
              <span className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Yeni təchizatçı
              </span>
            </Button>
            <Button onClick={openCreate}>
              <span className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Yeni alış
              </span>
            </Button>
          </div>
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
            placeholder="Alış №, faktura № və ya təchizatçı"
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
                    {['Alış №', 'Faktura №', 'Tarix', 'Təchizatçı', 'Anbar', 'Status', 'Ara cəm', 'ƏDV', 'Yekun', 'Əməliyyatlar'].map((header) => (
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
                      <td className="px-4 py-3">{purchase.invoiceNo}</td>
                      <td className="px-4 py-3">{toDateInput(purchase.purchaseDate)}</td>
                      <td className="px-4 py-3">{purchase.supplierName}</td>
                      <td className="px-4 py-3">{warehouses.find((warehouse) => warehouse.id === purchase.warehouseId)?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge status={purchase.status} />
                      </td>
                      <td className="px-4 py-3">{formatCurrency(purchase.subtotal, purchase.currencyCode)}</td>
                      <td className="px-4 py-3">{formatCurrency(purchase.vatTotal, purchase.currencyCode)}</td>
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
                            disabled={purchase.status === 'confirmed'}
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
                            disabled={purchase.status !== 'draft'}
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
          description="Tarix, təchizatçı və material sətirlərini burada daxil edin."
          onClose={closeModal}
          footer={footer}
        >
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
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
                <div className="flex gap-2">
                  <select
                    value={selectedSupplierId}
                    onChange={(event) => {
                      const selected = suppliers.find((supplier) => supplier.id === event.target.value);
                      setFormState((current) => ({ ...current, supplierName: selected?.name ?? '' }));
                    }}
                    disabled={modalReadOnly}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-50"
                  >
                    <option value="">Təchizatçı seçin</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.code ? `${supplier.code} · ${supplier.name}` : supplier.name}
                      </option>
                    ))}
                  </select>
                  {!modalReadOnly ? (
                    <Button type="button" variant="secondary" className="shrink-0" onClick={openSupplierModal}>
                      + Yeni
                    </Button>
                  ) : null}
                </div>
                {formState.supplierName ? <div className="text-xs text-slate-500">Seçilən: {formState.supplierName}</div> : null}
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Anbar</span>
                <select
                  value={formState.warehouseId || defaultWarehouseId}
                  onChange={(event) => setFormState((current) => ({ ...current, warehouseId: event.target.value }))}
                  disabled={modalReadOnly}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-50"
                >
                  <option value="">Anbar seçin</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.code} · {warehouse.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Status</span>
                <select
                  value={formState.status}
                  onChange={(event) => setFormState((current) => ({ ...current, status: event.target.value as PurchaseStatus }))}
                  disabled={modalReadOnly}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-50"
                >
                  <option value="draft">Qaralama</option>
                  <option value="confirmed">Təsdiqlənib</option>
                  <option value="cancelled">Ləğv edilib</option>
                </select>
              </label>

              <label className="block space-y-2 md:col-span-4">
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
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                <label className="block flex-1 space-y-2">
                  <span className="text-sm font-medium text-slate-700">Material seçimi</span>
                  <select
                    value={lineDraft.materialId}
                    onChange={(event) => setLineDraft((current) => ({ ...current, materialId: event.target.value }))}
                    disabled={modalReadOnly}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-50"
                  >
                    <option value="">Material seçin</option>
                    {selectedMaterials.map((material) => (
                      <option key={material.id} value={material.id}>
                        {material.materialNo} · {material.name}
                      </option>
                    ))}
                  </select>
                  {selectedMaterial ? (
                    <div className="rounded-xl bg-white px-3 py-2 text-xs text-slate-600">
                      <div>Əsas vahid: {materialBaseUnit(selectedMaterial)}</div>
                      <div>
                        1 bağlama:{' '}
                        {selectedMaterial.defaultUnitsPerPackage != null
                          ? `${formatInteger(selectedMaterial.defaultUnitsPerPackage)} ${materialBaseUnit(selectedMaterial)}`
                          : '—'}
                      </div>
                      <div>
                        1 palet:{' '}
                        {selectedMaterial.defaultUnitsPerPallet != null
                          ? `${formatInteger(selectedMaterial.defaultUnitsPerPallet)} ${materialBaseUnit(selectedMaterial)}`
                          : '—'}
                      </div>
                    </div>
                  ) : null}
                </label>

                <label className="block w-full space-y-2 lg:w-40">
                  <span className="text-sm font-medium text-slate-700">Miqdar tipi</span>
                  <select
                    value={lineDraft.quantityMode}
                    onChange={(event) =>
                      setLineDraft((current) => ({ ...current, quantityMode: event.target.value as PurchaseQuantityMode }))
                    }
                    disabled={modalReadOnly}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-50"
                  >
                    {QUANTITY_MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block w-full space-y-2 lg:w-36">
                  <span className="text-sm font-medium text-slate-700">Miqdar</span>
                  <Input
                    type="number"
                    step="0.0001"
                    value={lineDraft.quantity}
                    onChange={(event) => setLineDraft((current) => ({ ...current, quantity: event.target.value }))}
                    disabled={modalReadOnly}
                  />
                </label>

                <label className="block w-full space-y-2 lg:w-40">
                  <span className="text-sm font-medium text-slate-700">Vahid qiymət</span>
                  <Input
                    type="number"
                    step="0.0001"
                    value={lineDraft.unitPrice}
                    onChange={(event) => setLineDraft((current) => ({ ...current, unitPrice: event.target.value }))}
                    disabled={modalReadOnly}
                  />
                </label>

                <label className="block w-full space-y-2 lg:w-40">
                  <span className="text-sm font-medium text-slate-700">ƏDV</span>
                  <select
                    value={lineDraft.vatRate}
                    onChange={(event) => setLineDraft((current) => ({ ...current, vatRate: event.target.value as '0' | '18' }))}
                    disabled={modalReadOnly}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-50"
                  >
                    {VAT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                {!modalReadOnly ? (
                  <Button className="h-11 px-4" onClick={addOrUpdateLine}>
                    {editingLineIndex != null ? 'Yenilə' : 'Əlavə et'}
                  </Button>
                ) : null}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <div className="text-xs text-slate-500">Əsas miqdar</div>
                  <div className="mt-1 text-sm font-semibold text-slate-950">
                    {linePreview.baseQuantity != null
                      ? `${formatInteger(linePreview.baseQuantity)} ${materialBaseUnit(selectedMaterial)}`
                      : '—'}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <div className="text-xs text-slate-500">ƏDV məbləği</div>
                  <div className="mt-1 text-sm font-semibold text-slate-950">{formatCurrency(linePreview.vatAmount, 'AZN')}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <div className="text-xs text-slate-500">Sətir cəmi</div>
                  <div className="mt-1 text-sm font-semibold text-slate-950">{formatCurrency(linePreview.lineTotal, 'AZN')}</div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      {['№', 'Material', 'Miqdar tipi', 'Miqdar', 'Əsas miqdar', 'Vahid qiymət', 'ƏDV', 'ƏDV məbləği', 'Cəmi', 'Sil'].map(
                        (header) => (
                          <th
                            key={header}
                            className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em]"
                          >
                            {header}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {formState.items.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-center text-slate-500" colSpan={10}>
                          Hələ material əlavə edilməyib
                        </td>
                      </tr>
                    ) : (
                      formState.items.map((line, index) => {
                        const material = selectedMaterials.find((item) => item.id === line.materialId) ?? null;
                        const lineResult = calculateLine(material, line);

                        return (
                          <tr
                            key={`${index}-${line.materialId || 'draft'}`}
                            className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                          >
                            <td className="px-4 py-3 font-medium text-slate-950">{index + 1}</td>
                            <td className="px-4 py-3">
                              <button type="button" className="text-left text-slate-950 hover:underline" onClick={() => editLine(index)}>
                                {material ? `${material.materialNo} · ${material.name}` : '—'}
                              </button>
                            </td>
                            <td className="px-4 py-3">{line.quantityMode === 'base' ? 'Əsas vahid' : line.quantityMode === 'package' ? 'Qablaşdırma' : 'Palet'}</td>
                            <td className="px-4 py-3">{formatNumber(toNumber(line.quantity), 4)}</td>
                            <td className="px-4 py-3">
                              {lineResult.baseQuantity != null ? `${formatInteger(lineResult.baseQuantity)} ${materialBaseUnit(material)}` : '—'}
                            </td>
                            <td className="px-4 py-3">{formatCurrency(toNumber(line.unitPrice), 'AZN')}</td>
                            <td className="px-4 py-3">{line.vatRate === '18' ? 'ƏDV-li 18%' : 'ƏDV-siz'}</td>
                            <td className="px-4 py-3">{formatCurrency(lineResult.vatAmount, 'AZN')}</td>
                            <td className="px-4 py-3">{formatCurrency(lineResult.lineTotal, 'AZN')}</td>
                            <td className="px-4 py-3">
                              <Button
                                variant="ghost"
                                className="h-9 px-3 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                onClick={() => deleteLine(index)}
                                disabled={modalReadOnly}
                              >
                                <span className="inline-flex items-center gap-2">
                                  <Trash2 className="h-4 w-4" />
                                  Sil
                                </span>
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
              <div>
                <div className="text-sm text-slate-500">Ara cəm</div>
                <div className="text-lg font-semibold text-slate-950">{formatCurrency(purchaseSubtotal, 'AZN')}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">ƏDV cəmi</div>
                <div className="text-lg font-semibold text-slate-950">{formatCurrency(purchaseVatTotal, 'AZN')}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Yekun məbləğ</div>
                <div className="text-lg font-semibold text-slate-950">{formatCurrency(purchaseTotal, 'AZN')}</div>
              </div>
            </div>

            <div className="grid gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600 md:grid-cols-2">
              <div>Alış №: avtomatik</div>
              <div>Faktura №: avtomatik</div>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {supplierModalOpen ? (
        <ModalShell
          title="Yeni təchizatçı"
          description="Sürətli əlavə etmə üçün sadə kart."
          onClose={closeSupplierModal}
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={closeSupplierModal} disabled={supplierSaving}>
                Bağla
              </Button>
              <Button onClick={() => void saveSupplier()} disabled={supplierSaving}>
                {supplierSaving ? 'Yadda saxlanılır...' : 'Yadda saxla'}
              </Button>
            </div>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Ad</span>
              <Input value={supplierForm.name} onChange={(event) => setSupplierForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Telefon</span>
              <Input value={supplierForm.phone} onChange={(event) => setSupplierForm((current) => ({ ...current, phone: event.target.value }))} />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <Input value={supplierForm.email} onChange={(event) => setSupplierForm((current) => ({ ...current, email: event.target.value }))} />
            </label>
            <label className="block space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-slate-700">VÖEN</span>
              <Input value={supplierForm.taxId} onChange={(event) => setSupplierForm((current) => ({ ...current, taxId: event.target.value }))} />
            </label>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}
