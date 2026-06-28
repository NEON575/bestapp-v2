import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button, Input } from '@bestapp/ui';
import { CheckCircle2, Eye, Plus, PencilLine, RefreshCw, Trash2, XCircle } from 'lucide-react';
import { customersClient } from '../shared/api/customers';
import type { MaterialListItem } from '../shared/materials';
import { calculationsClient, type CalculationRecord, type CalculationStatus } from '../shared/api/calculations';
import { materialsClient } from '../shared/api/materials';
import { warehousesClient } from '../shared/api/warehouses';
import { EmptyState, ErrorState, LoadingState, PageHeader, Pagination } from '../shared/components';
import { formatCurrency, formatDateOnly, formatNumber } from '../shared/lib/format';
import { useToast } from '../shared/toast/toast-context';
import type { CustomerListItem, WarehouseStockLevelItem } from '@bestapp/shared';

type MaterialLineDraft = {
  materialId: string;
  quantity: string;
  unit: string;
  unitCost: string;
};

type ServiceLineDraft = {
  serviceName: string;
  quantity: string;
  unit: string;
  unitPrice: string;
};

type FormState = {
  customerName: string;
  productName: string;
  quantity: string;
  note: string;
  profitPercent: string;
  finalPrice: string;
  status: CalculationStatus;
  materialLines: MaterialLineDraft[];
  serviceLines: ServiceLineDraft[];
};

type Mode = 'create' | 'edit' | 'view';
type FinalPriceMode = 'auto' | 'manual';

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat('az-Latn-AZ', { maximumFractionDigits: 4 }).format(value);
}

function emptyMaterialLine(): MaterialLineDraft {
  return {
    materialId: '',
    quantity: '',
    unit: '',
    unitCost: ''
  };
}

function emptyServiceLine(): ServiceLineDraft {
  return {
    serviceName: '',
    quantity: '',
    unit: '',
    unitPrice: ''
  };
}

function emptyFormState(): FormState {
  return {
    customerName: '',
    productName: '',
    quantity: '',
    note: '',
    profitPercent: '30',
    finalPrice: '',
    status: 'draft',
    materialLines: [],
    serviceLines: []
  };
}

function materialBaseUnit(material?: MaterialListItem | null) {
  return material?.stockUnit || material?.unit || '—';
}

function materialDisplayName(material?: MaterialListItem | null) {
  if (!material) {
    return '—';
  }

  return `${material.materialNo} · ${material.name}`;
}

function ModalShell({
  title,
  description,
  children,
  footer,
  onClose,
  fullPage = false
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
  fullPage?: boolean;
}) {
  if (fullPage) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-white/70 bg-white/90 px-6 py-5 shadow-xl shadow-slate-900/10 backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
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

        <div className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-xl shadow-slate-900/10 backdrop-blur">{children}</div>

        <div className="sticky bottom-4 rounded-3xl border border-white/70 bg-white/90 px-6 py-4 shadow-xl shadow-slate-900/10 backdrop-blur">
          {footer}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
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

function StatusBadge({ status }: { status: CalculationStatus }) {
  const classes =
    status === 'approved'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'converted'
        ? 'bg-sky-50 text-sky-700'
        : status === 'cancelled'
          ? 'bg-rose-50 text-rose-700'
          : 'bg-slate-100 text-slate-600';

  const labels: Record<CalculationStatus, string> = {
    draft: 'Qaralama',
    approved: 'Təsdiqləndi',
    converted: 'Çevrildi',
    cancelled: 'Ləğv edildi'
  };

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>{labels[status]}</span>;
}

export function CalculationsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id?: string }>();
  const [calculations, setCalculations] = useState<CalculationRecord[]>([]);
  const [materials, setMaterials] = useState<MaterialListItem[]>([]);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [stockLevels, setStockLevels] = useState<WarehouseStockLevelItem[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | CalculationStatus>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('create');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorCalculation, setEditorCalculation] = useState<CalculationRecord | null>(null);
  const [formState, setFormState] = useState<FormState>(emptyFormState());
  const [materialDraft, setMaterialDraft] = useState<MaterialLineDraft>(emptyMaterialLine());
  const [serviceDraft, setServiceDraft] = useState<ServiceLineDraft>(emptyServiceLine());
  const [editingMaterialIndex, setEditingMaterialIndex] = useState<number | null>(null);
  const [editingServiceIndex, setEditingServiceIndex] = useState<number | null>(null);
  const [finalPriceMode, setFinalPriceMode] = useState<FinalPriceMode>('auto');
  const editorId = params.id ?? null;
  const isCreateRoute = location.pathname.endsWith('/new');
  const isEditorRoute = isCreateRoute || Boolean(editorId);

  const selectedMaterial = useMemo(
    () => materials.find((material) => material.id === materialDraft.materialId) ?? null,
    [materialDraft.materialId, materials]
  );
  const selectedCustomerId = useMemo(
    () =>
      customers.find((customer) =>
        (customer.companyName ? `${customer.name} · ${customer.companyName}` : customer.name) === formState.customerName
      )?.id ?? '',
    [customers, formState.customerName]
  );

  const stockMap = useMemo(() => {
    const map = new Map<string, { available: number; unitCost: number }>();

    for (const level of stockLevels) {
      const materialId = level.material?.id || level.materialId;
      const current = map.get(materialId) ?? { available: 0, unitCost: 0 };
      current.available += Number(level.available ?? 0);
      const suggested = Number(level.material?.averageCost ?? level.material?.unitCost ?? level.material?.costPrice ?? 0);
      if (current.unitCost <= 0 && suggested > 0) {
        current.unitCost = suggested;
      }
      map.set(materialId, current);
    }

    return map;
  }, [stockLevels]);

  const selectedMaterialStock = useMemo(() => {
    if (!selectedMaterial) {
      return { available: 0, unitCost: 0 };
    }

    const stock = stockMap.get(selectedMaterial.id);
    return {
      available: stock?.available ?? 0,
      unitCost: stock?.unitCost ?? 0
    };
  }, [selectedMaterial, stockMap]);

  const loadData = async (nextPage = page, nextSearch = search, nextStatus = status) => {
    setLoading(true);
    setError(null);

    try {
      const [calculationResponse, materialResponse, customerResponse, stockResponse] = await Promise.all([
        calculationsClient.list({
          page: nextPage,
          limit,
          search: nextSearch || undefined,
          status: nextStatus === 'all' ? undefined : nextStatus
        }),
        materialsClient.list({
          page: 1,
          limit: 200,
          status: 'active'
        }),
        customersClient.list({ page: 1, limit: 200, status: 'active' }),
        warehousesClient.levels({ page: 1, limit: 200 })
      ]);

      setCalculations(calculationResponse.data);
      setTotalPages(calculationResponse.meta.totalPages);
      setTotalItems(calculationResponse.meta.total);
      setMaterials(materialResponse.data);
      setCustomers(customerResponse.data);
      setStockLevels(stockResponse.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Hesablamalar yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (location.pathname === '/calculations/new' || location.pathname.includes('/calculations/') ) {
      return;
    }
    const timer = window.setTimeout(() => {
      void loadData(page, search, status);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [page, search, status, location.pathname]);

  useEffect(() => {
    if (!isEditorRoute) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        await loadData(1, '', 'all');

        if (cancelled) {
          return;
        }

        if (editorId) {
          const calculation = await calculationsClient.get(editorId);
          if (cancelled) {
            return;
          }

          setEditorCalculation(calculation);
          setMode(location.pathname.endsWith('/edit') ? 'edit' : 'view');
          setEditingId(calculation.id);
          setFormState({
            customerName: calculation.customerName ?? '',
            productName: calculation.productName,
            quantity: String(calculation.quantity),
            note: calculation.note ?? '',
            profitPercent: String(calculation.profitPercent),
            finalPrice: String(calculation.finalPrice),
            status: calculation.status,
            materialLines: calculation.sections.materialLines.map(toMaterialDraft),
            serviceLines: calculation.sections.serviceLines.map(toServiceDraft)
          });
          setFinalPriceMode('manual');
        } else {
          setEditorCalculation(null);
          setMode('create');
          setEditingId(null);
          setFormState(emptyFormState());
          setFinalPriceMode('auto');
        }

        setMaterialDraft(emptyMaterialLine());
        setServiceDraft(emptyServiceLine());
        setEditingMaterialIndex(null);
        setEditingServiceIndex(null);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Hesablama yüklənmədi');
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [editorId, isEditorRoute, location.pathname]);

  const refresh = async () => {
    await loadData(page, search, status);
  };

  const openCreate = () => {
    navigate('/calculations/new');
  };

  const toMaterialDraft = (line: CalculationRecord['sections']['materialLines'][number]): MaterialLineDraft => ({
    materialId: line.materialId,
    quantity: String(line.quantity),
    unit: line.unit,
    unitCost: String(line.unitCost)
  });

  const toServiceDraft = (line: CalculationRecord['sections']['serviceLines'][number]): ServiceLineDraft => ({
    serviceName: line.serviceName,
    quantity: String(line.quantity),
    unit: line.unit,
    unitPrice: String(line.unitPrice)
  });

  const openView = (calculation: CalculationRecord) => {
    navigate(`/calculations/${calculation.id}`);
  };

  const openEdit = (calculation: CalculationRecord) => {
    navigate(`/calculations/${calculation.id}/edit`);
  };

  const closeModal = () => {
    navigate('/calculations');
  };

  const materialCost = useMemo(
    () =>
      formState.materialLines.reduce((sum, line) => {
        const quantity = toNumber(line.quantity);
        const unitCost = toNumber(line.unitCost);
        return sum + quantity * unitCost;
      }, 0),
    [formState.materialLines]
  );

  const serviceCost = useMemo(
    () =>
      formState.serviceLines.reduce((sum, line) => {
        const quantity = toNumber(line.quantity);
        const unitPrice = toNumber(line.unitPrice);
        return sum + quantity * unitPrice;
      }, 0),
    [formState.serviceLines]
  );

  const totalCost = materialCost + serviceCost;
  const profitPercent = toNumber(formState.profitPercent);
  const profitAmount = roundMoney((totalCost * profitPercent) / 100);
  const salePrice = roundMoney(totalCost + profitAmount);
  const finalPrice = finalPriceMode === 'manual' ? toNumber(formState.finalPrice) : salePrice;
  const realProfit = roundMoney(finalPrice - totalCost);
  const realProfitPercent = totalCost > 0 ? roundMoney((realProfit / totalCost) * 100) : 0;
  const draftMaterialAvailable = selectedMaterial ? selectedMaterialStock.available : 0;
  const draftUnitCost = selectedMaterial ? selectedMaterialStock.unitCost : 0;

  const buildPayload = (): Parameters<typeof calculationsClient.create>[0] => ({
    customerName: formState.customerName.trim() || undefined,
    productName: formState.productName.trim(),
    quantity: toNumber(formState.quantity),
    note: formState.note.trim() || undefined,
    profitPercent,
    finalPrice,
    status: formState.status,
    materialLines: formState.materialLines.map((line) => ({
      materialId: line.materialId,
      quantity: toNumber(line.quantity),
      unit: line.unit.trim(),
      unitCost: toNumber(line.unitCost)
    })),
    serviceLines: formState.serviceLines.map((line) => ({
      serviceName: line.serviceName.trim(),
      quantity: toNumber(line.quantity),
      unit: line.unit.trim(),
      unitPrice: toNumber(line.unitPrice)
    }))
  });

  const persist = async () => {
    const payload = buildPayload();

    if (editingId && mode === 'edit') {
      return calculationsClient.update(editingId, payload);
    }

    return calculationsClient.create(payload);
  };

  const saveCalculation = async () => {
    if (!formState.productName.trim()) {
      toast.warning('Məhsul adını daxil edin');
      return;
    }

    if (!formState.customerName.trim()) {
      toast.warning('Müştəri adını daxil edin');
      return;
    }

    if (formState.materialLines.length === 0 && formState.serviceLines.length === 0) {
      toast.warning('Ən azı 1 material və ya xidmət sətri əlavə edin');
      return;
    }

    setSaving(true);
    try {
      const saved = await persist();
      toast.success('Hesablama saxlanıldı', saved.number);
      closeModal();
      await loadData(page, search, status);
      return saved;
    } catch (saveError) {
      toast.error('Hesablama saxlanmadı', saveError instanceof Error ? saveError.message : 'Xəta baş verdi');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const addOrUpdateMaterialLine = () => {
    const material = selectedMaterial;
    if (!material) {
      toast.warning('Material seçin');
      return;
    }

    const quantity = toNumber(materialDraft.quantity);
    const unit = materialDraft.unit.trim() || materialBaseUnit(material);
    const unitCost = materialDraft.unitCost.trim() ? toNumber(materialDraft.unitCost) : draftUnitCost;

    if (quantity <= 0) {
      toast.warning('Miqdar 0-dan böyük olmalıdır');
      return;
    }

    const nextLine: MaterialLineDraft = {
      materialId: material.id,
      quantity: String(quantity),
      unit,
      unitCost: String(unitCost)
    };

    setFormState((current) => {
      const nextItems = [...current.materialLines];
      if (editingMaterialIndex != null && nextItems[editingMaterialIndex]) {
        nextItems[editingMaterialIndex] = nextLine;
      } else {
        nextItems.push(nextLine);
      }
      return { ...current, materialLines: nextItems };
    });

    setMaterialDraft(emptyMaterialLine());
    setEditingMaterialIndex(null);
  };

  const addOrUpdateServiceLine = () => {
    const serviceName = serviceDraft.serviceName.trim();
    const quantity = toNumber(serviceDraft.quantity);
    const unit = serviceDraft.unit.trim();
    const unitPrice = serviceDraft.unitPrice.trim() ? toNumber(serviceDraft.unitPrice) : 0;

    if (!serviceName) {
      toast.warning('Xidmət adı daxil edin');
      return;
    }

    if (!unit) {
      toast.warning('Vahidi daxil edin');
      return;
    }

    if (quantity <= 0) {
      toast.warning('Miqdar 0-dan böyük olmalıdır');
      return;
    }

    const nextLine: ServiceLineDraft = {
      serviceName,
      quantity: String(quantity),
      unit,
      unitPrice: String(unitPrice)
    };

    setFormState((current) => {
      const nextItems = [...current.serviceLines];
      if (editingServiceIndex != null && nextItems[editingServiceIndex]) {
        nextItems[editingServiceIndex] = nextLine;
      } else {
        nextItems.push(nextLine);
      }
      return { ...current, serviceLines: nextItems };
    });

    setServiceDraft(emptyServiceLine());
    setEditingServiceIndex(null);
  };

  const approveCalculation = async (calculation: CalculationRecord) => {
    try {
      await calculationsClient.approve(calculation.id);
      toast.success('Hesablama təsdiqləndi');
      await refresh();
    } catch (approveError) {
      toast.error('Hesablama təsdiqlənmədi', approveError instanceof Error ? approveError.message : 'Xəta baş verdi');
    }
  };

  const cancelCalculation = async (calculation: CalculationRecord) => {
    try {
      await calculationsClient.cancel(calculation.id);
      toast.success('Hesablama ləğv edildi');
      await refresh();
    } catch (cancelError) {
      toast.error('Hesablama ləğv edilmədi', cancelError instanceof Error ? cancelError.message : 'Xəta baş verdi');
    }
  };

  const removeCalculation = async (calculation: CalculationRecord) => {
    if (!window.confirm('Bu hesablama silinsin?')) {
      return;
    }

    try {
      await calculationsClient.remove(calculation.id);
      toast.success('Hesablama silindi');
      await refresh();
    } catch (removeError) {
      toast.error('Hesablama silinmədi', removeError instanceof Error ? removeError.message : 'Xəta baş verdi');
    }
  };

  const activeCalculation = isEditorRoute
    ? editorCalculation
    : calculations.find((calculation) => calculation.id === editingId) ?? null;
  const modalReadOnly = mode === 'view' || (mode === 'edit' && activeCalculation?.status !== 'draft');

  const footer = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-slate-500">
        {mode === 'view'
          ? 'Yalnız baxış rejimi'
          : modalReadOnly
            ? 'Təsdiqlənmiş və ya ləğv edilmiş hesablama redaktə edilə bilməz'
            : 'Material və xidmət sətrlərini əlavə edin, sonra yadda saxlayın.'}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={closeModal} disabled={saving}>
          Bağla
        </Button>
        {!modalReadOnly ? (
          <Button onClick={() => void saveCalculation()} disabled={saving}>
            {saving ? 'Yadda saxlanılır...' : 'Yadda saxla'}
          </Button>
        ) : null}
      </div>
    </div>
  );

  const modalOpen = isEditorRoute;

  return (
    <>
      <div className={isEditorRoute ? 'hidden' : 'space-y-6'}>
      <PageHeader
        title="Hesablama"
        description="Maya, satış və qazancı sifarişdən əvvəl burada hesablayın."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => navigate('/calculation-settings')}>
              Hesablama ayarları
            </Button>
            <Button variant="secondary" onClick={() => void refresh()}>
              <span className="inline-flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Yenilə
              </span>
            </Button>
            <Button onClick={openCreate}>
              <span className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Yeni hesablama
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
            placeholder="Hesablama №, məhsul və ya müştəri"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Status</span>
          <select
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value as 'all' | CalculationStatus);
            }}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
          >
            <option value="all">Hamısı</option>
            <option value="draft">Qaralama</option>
            <option value="approved">Təsdiqləndi</option>
            <option value="converted">Çevrildi</option>
            <option value="cancelled">Ləğv edildi</option>
          </select>
        </label>
      </div>

      {loading ? (
        <LoadingState rows={4} />
      ) : error ? (
        <ErrorState title="Hesablamalar yüklənmədi" description={error} onRetry={() => void loadData(page, search, status)} />
      ) : calculations.length === 0 ? (
        <EmptyState
          title="Hesablama tapılmadı"
          description="Yeni hesablama yaradaraq maya dəyərini və satış qiymətini hesablayın."
          icon={Plus}
          actionLabel="Yeni hesablama"
          onAction={openCreate}
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    {['Hesablama №', 'Müştəri', 'Məhsul', 'Say', 'Maya', 'Satış qiyməti', 'Qazanc', 'Status', 'Əməliyyatlar'].map(
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
                  {calculations.map((calculation) => (
                    <tr key={calculation.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-4 py-3 font-medium text-slate-950">
                        <div>{calculation.number}</div>
                        <div className="text-xs text-slate-500">{formatDateOnly(calculation.createdAt)}</div>
                      </td>
                      <td className="px-4 py-3">{calculation.customerName}</td>
                      <td className="px-4 py-3">{calculation.productName}</td>
                      <td className="px-4 py-3">{formatNumber(calculation.quantity, 4)}</td>
                      <td className="px-4 py-3">{formatCurrency(calculation.totalCost, 'AZN')}</td>
                      <td className="px-4 py-3">{formatCurrency(calculation.finalPrice, 'AZN')}</td>
                      <td className="px-4 py-3">
                        {formatCurrency(calculation.profit, 'AZN')} · {formatNumber(calculation.totalCost > 0 ? (calculation.profit / calculation.totalCost) * 100 : 0, 2)}%
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={calculation.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" className="h-9 px-3" onClick={() => openView(calculation)}>
                            <span className="inline-flex items-center gap-2">
                              <Eye className="h-4 w-4" />
                              Bax
                            </span>
                          </Button>
                          <Button
                            variant="secondary"
                            className="h-9 px-3"
                            onClick={() => openEdit(calculation)}
                            disabled={calculation.status !== 'draft'}
                          >
                            <span className="inline-flex items-center gap-2">
                              <PencilLine className="h-4 w-4" />
                              Redaktə
                            </span>
                          </Button>
                          <Button
                            variant="ghost"
                            className="h-9 px-3 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            onClick={() => void removeCalculation(calculation)}
                            disabled={calculation.status === 'converted'}
                          >
                            <span className="inline-flex items-center gap-2">
                              <Trash2 className="h-4 w-4" />
                              Sil
                            </span>
                          </Button>
                          <Button
                            variant="secondary"
                            className="h-9 px-3"
                            onClick={() => void approveCalculation(calculation)}
                            disabled={calculation.status !== 'draft'}
                          >
                            <span className="inline-flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4" />
                              Təsdiqlə
                            </span>
                          </Button>
                          <Button
                            variant="secondary"
                            className="h-9 px-3"
                            onClick={() => void cancelCalculation(calculation)}
                            disabled={calculation.status === 'cancelled' || calculation.status === 'converted'}
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
          <div className="text-sm text-slate-500">Cəmi {totalItems} hesablama</div>
        </div>
      )}

      </div>

      {modalOpen ? (
        <ModalShell fullPage={isEditorRoute}
          title={mode === 'create' ? 'Yeni hesablama' : mode === 'edit' ? 'Hesablamanı redaktə et' : 'Hesablama məlumatı'}
          description="Müştəri, məhsul, materiallar və xidmətləri burada daxil edin."
          onClose={closeModal}
          footer={footer}
        >
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-5">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Müştəri adı</span>
                <div className="flex gap-2">
                  <select
                    value={selectedCustomerId}
                    onChange={(event) => {
                      const selected = customers.find((customer) => customer.id === event.target.value);
                      const nextName = selected ? (selected.companyName ? `${selected.name} · ${selected.companyName}` : selected.name) : '';
                      setFormState((current) => ({ ...current, customerName: nextName }));
                    }}
                    disabled={modalReadOnly}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-50"
                  >
                    <option value="">Müştəri seçin</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.companyName ? `${customer.name} · ${customer.companyName}` : customer.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0"
                    onClick={() => setFormState((current) => ({ ...current, customerName: '' }))}
                    disabled={modalReadOnly}
                  >
                    Təmizlə
                  </Button>
                </div>
                <Input
                  value={formState.customerName}
                  onChange={(event) => setFormState((current) => ({ ...current, customerName: event.target.value }))}
                  disabled={modalReadOnly}
                  placeholder="Manual daxil etmək istəsəniz"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Məhsul adı</span>
                <Input
                  value={formState.productName}
                  onChange={(event) => setFormState((current) => ({ ...current, productName: event.target.value }))}
                  disabled={modalReadOnly}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Say</span>
                <Input
                  type="number"
                  step="0.0001"
                  value={formState.quantity}
                  onChange={(event) => setFormState((current) => ({ ...current, quantity: event.target.value }))}
                  disabled={modalReadOnly}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Qazanc faizi</span>
                <Input
                  type="number"
                  step="0.01"
                  value={formState.profitPercent}
                  onChange={(event) => setFormState((current) => ({ ...current, profitPercent: event.target.value }))}
                  disabled={modalReadOnly}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Status</span>
                <select
                  value={formState.status}
                  onChange={(event) => setFormState((current) => ({ ...current, status: event.target.value as CalculationStatus }))}
                  disabled={modalReadOnly}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-50"
                >
                  <option value="draft">Qaralama</option>
                  <option value="approved">Təsdiqləndi</option>
                  <option value="converted">Çevrildi</option>
                  <option value="cancelled">Ləğv edildi</option>
                </select>
              </label>

              <label className="block space-y-2 md:col-span-5">
                <span className="text-sm font-medium text-slate-700">Qeyd</span>
                <textarea
                  rows={3}
                  value={formState.note}
                  onChange={(event) => setFormState((current) => ({ ...current, note: event.target.value }))}
                  disabled={modalReadOnly}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-50"
                />
              </label>

              <label className="block space-y-2 md:col-span-5">
                <span className="text-sm font-medium text-slate-700">Final qiymət</span>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={finalPriceMode === 'manual' ? formState.finalPrice : String(salePrice)}
                    onChange={(event) => {
                      setFinalPriceMode('manual');
                      setFormState((current) => ({ ...current, finalPrice: event.target.value }));
                    }}
                    disabled={modalReadOnly}
                  />
                  {!modalReadOnly ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setFinalPriceMode('auto');
                        setFormState((current) => ({ ...current, finalPrice: String(salePrice) }));
                      }}
                    >
                      Avto
                    </Button>
                  ) : null}
                </div>
                <div className="text-xs text-slate-500">Avto rejimdə satış qiyməti ilə sinxron qalır.</div>
              </label>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">Material seçimi</span>
                  <select
                    value={materialDraft.materialId}
                    onChange={(event) => {
                      const material = materials.find((item) => item.id === event.target.value) ?? null;
                      const nextUnit = material ? materialBaseUnit(material) : '';
                      const stock = material ? stockMap.get(material.id) : undefined;
                      const nextUnitCost = stock?.unitCost ?? 0;

                      setMaterialDraft((current) => ({
                        ...current,
                        materialId: event.target.value,
                        unit: nextUnit,
                        unitCost: material ? String(nextUnitCost) : current.unitCost
                      }));
                    }}
                    disabled={modalReadOnly}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-50"
                  >
                    <option value="">Material seçin</option>
                    {materials.map((material) => (
                      <option key={material.id} value={material.id}>
                        {materialDisplayName(material)}
                      </option>
                    ))}
                  </select>
                  {selectedMaterial ? (
                    <div className="rounded-xl bg-white px-3 py-2 text-xs text-slate-600">
                      <div>Qalıq: {formatQuantity(draftMaterialAvailable)} {materialBaseUnit(selectedMaterial)}</div>
                      <div>Maya: {formatCurrency(draftUnitCost, 'AZN')} / {materialBaseUnit(selectedMaterial)}</div>
                    </div>
                  ) : null}
                </label>

                <div className="grid gap-3 md:grid-cols-4">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">Miqdar</span>
                    <Input
                      type="number"
                      step="0.0001"
                      value={materialDraft.quantity}
                      onChange={(event) => setMaterialDraft((current) => ({ ...current, quantity: event.target.value }))}
                      disabled={modalReadOnly}
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">Vahid</span>
                    <Input
                      value={materialDraft.unit}
                      onChange={(event) => setMaterialDraft((current) => ({ ...current, unit: event.target.value }))}
                      disabled={modalReadOnly}
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">Vahid maya</span>
                    <Input
                      type="number"
                      step="0.0001"
                      value={materialDraft.unitCost}
                      onChange={(event) => setMaterialDraft((current) => ({ ...current, unitCost: event.target.value }))}
                      disabled={modalReadOnly}
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">Cəmi</span>
                    <Input value={formatCurrency(toNumber(materialDraft.quantity) * toNumber(materialDraft.unitCost), 'AZN')} disabled />
                  </label>
                </div>
              </div>

              {!modalReadOnly ? (
                <div className="mt-4 flex justify-end">
                  <Button className="h-11 px-4" onClick={addOrUpdateMaterialLine}>
                    {editingMaterialIndex != null ? 'Yenilə' : 'Əlavə et'}
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      {['Material', 'Miqdar', 'Vahid', 'Vahid maya', 'Cəmi', 'Sil'].map((header) => (
                        <th key={header} className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em]">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {formState.materialLines.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-center text-slate-500" colSpan={6}>
                          Hələ material əlavə edilməyib
                        </td>
                      </tr>
                    ) : (
                      formState.materialLines.map((line, index) => {
                        const material = materials.find((item) => item.id === line.materialId) ?? null;
                        const lineTotal = toNumber(line.quantity) * toNumber(line.unitCost);

                        return (
                          <tr key={`${line.materialId}-${index}`} className="border-b border-slate-100 last:border-b-0">
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                className="text-left font-medium text-slate-950 hover:underline"
                                onClick={() => {
                                  setEditingMaterialIndex(index);
                                  setMaterialDraft(line);
                                }}
                              >
                                {materialDisplayName(material)}
                              </button>
                            </td>
                            <td className="px-4 py-3">{formatQuantity(toNumber(line.quantity))}</td>
                            <td className="px-4 py-3">{line.unit}</td>
                            <td className="px-4 py-3">{formatCurrency(toNumber(line.unitCost), 'AZN')}</td>
                            <td className="px-4 py-3">{formatCurrency(lineTotal, 'AZN')}</td>
                            <td className="px-4 py-3">
                              <Button
                                variant="ghost"
                                className="h-9 px-3 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                onClick={() =>
                                  setFormState((current) => ({
                                    ...current,
                                    materialLines: current.materialLines.filter((_, currentIndex) => currentIndex !== index)
                                  }))
                                }
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

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 md:grid-cols-4">
                <label className="block space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Xidmət adı</span>
                  <select
                    value={serviceDraft.serviceName}
                    onChange={(event) => setServiceDraft((current) => ({ ...current, serviceName: event.target.value }))}
                    disabled={modalReadOnly}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-50"
                  >
                    <option value="">Xidmət seçin</option>
                    {['Çap', 'Kəsim', 'Laminasiya', 'Büküm', 'Dizayn', 'Çatdırılma', 'Digər'].map((service) => (
                      <option key={service} value={service}>
                        {service}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">Miqdar</span>
                  <Input
                    type="number"
                    step="0.0001"
                    value={serviceDraft.quantity}
                    onChange={(event) => setServiceDraft((current) => ({ ...current, quantity: event.target.value }))}
                    disabled={modalReadOnly}
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">Vahid</span>
                  <Input
                    value={serviceDraft.unit}
                    onChange={(event) => setServiceDraft((current) => ({ ...current, unit: event.target.value }))}
                    disabled={modalReadOnly}
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">Vahid qiymət</span>
                  <Input
                    type="number"
                    step="0.0001"
                    value={serviceDraft.unitPrice}
                    onChange={(event) => setServiceDraft((current) => ({ ...current, unitPrice: event.target.value }))}
                    disabled={modalReadOnly}
                  />
                </label>
              </div>

              {!modalReadOnly ? (
                <div className="mt-4 flex justify-end">
                  <Button className="h-11 px-4" onClick={addOrUpdateServiceLine}>
                    {editingServiceIndex != null ? 'Yenilə' : 'Əlavə et'}
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      {['Xidmət', 'Miqdar', 'Vahid', 'Vahid qiymət', 'Cəmi', 'Sil'].map((header) => (
                        <th key={header} className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em]">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {formState.serviceLines.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-center text-slate-500" colSpan={6}>
                          Hələ xidmət əlavə edilməyib
                        </td>
                      </tr>
                    ) : (
                      formState.serviceLines.map((line, index) => {
                        const lineTotal = toNumber(line.quantity) * toNumber(line.unitPrice);

                        return (
                          <tr key={`${line.serviceName}-${index}`} className="border-b border-slate-100 last:border-b-0">
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                className="text-left font-medium text-slate-950 hover:underline"
                                onClick={() => {
                                  setEditingServiceIndex(index);
                                  setServiceDraft(line);
                                }}
                              >
                                {line.serviceName}
                              </button>
                            </td>
                            <td className="px-4 py-3">{formatQuantity(toNumber(line.quantity))}</td>
                            <td className="px-4 py-3">{line.unit}</td>
                            <td className="px-4 py-3">{formatCurrency(toNumber(line.unitPrice), 'AZN')}</td>
                            <td className="px-4 py-3">{formatCurrency(lineTotal, 'AZN')}</td>
                            <td className="px-4 py-3">
                              <Button
                                variant="ghost"
                                className="h-9 px-3 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                onClick={() =>
                                  setFormState((current) => ({
                                    ...current,
                                    serviceLines: current.serviceLines.filter((_, currentIndex) => currentIndex !== index)
                                  }))
                                }
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
                <div className="text-sm text-slate-500">Material maya</div>
                <div className="text-lg font-semibold text-slate-950">{formatCurrency(materialCost, 'AZN')}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Xidmət maya</div>
                <div className="text-lg font-semibold text-slate-950">{formatCurrency(serviceCost, 'AZN')}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Cəmi maya</div>
                <div className="text-lg font-semibold text-slate-950">{formatCurrency(totalCost, 'AZN')}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Qazanc faizi</div>
                <div className="text-lg font-semibold text-slate-950">{formatNumber(profitPercent, 2)}%</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Qazanc məbləği</div>
                <div className="text-lg font-semibold text-slate-950">{formatCurrency(profitAmount, 'AZN')}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Tövsiyə satış qiyməti</div>
                <div className="text-lg font-semibold text-slate-950">{formatCurrency(salePrice, 'AZN')}</div>
              </div>
              <div className="md:col-span-3">
                <div className="text-sm text-slate-500">Final qiymət</div>
                <div className="text-lg font-semibold text-slate-950">{formatCurrency(finalPrice, 'AZN')}</div>
                <div className="mt-2 text-sm text-slate-600">
                  Real qazanc: {formatCurrency(realProfit, 'AZN')} · {formatNumber(realProfitPercent, 2)}%
                </div>
              </div>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </>
  );
}
