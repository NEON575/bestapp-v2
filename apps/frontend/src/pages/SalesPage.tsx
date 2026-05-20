import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type {
  CreateCustomerDto,
  CustomerListItem,
  QuickCreateSalesEntryDto,
  SalesEntryItem,
  SalesEntryQueryDto,
  SalesGridSummary,
  UserSummary
} from '@bestapp/shared';
import { SalesDeliveryStatus, SalesPaymentStatus, SalesPaymentType } from '@bestapp/shared';
import { Button, Input } from '@bestapp/ui';
import { customersClient } from '../shared/api/customers';
import { salesClient } from '../shared/api/sales';
import { usersClient } from '../shared/api/users';
import { EmptyState, ErrorState, FilterBar, LoadingState, Modal, PageHeader, Pagination } from '../shared/components';
import { formatCurrency, formatDateOnly, formatNumber, formatPercent } from '../shared/lib/format';
import { getSalesLabel, salesDeliveryStatusLabels, salesPaymentStatusLabels, salesPaymentTypeLabels, salesProductionStageLabels, salesQaimaLabels } from '../shared/lib/salesLabels';
import { useToast } from '../shared/toast/toast-context';

type QueryState = SalesEntryQueryDto & {
  customerId: string;
  managerId: string;
  category: string;
  paymentType: string;
  productionStage: string;
  deliveryStatus: string;
  qaimaStatus: string;
  paymentStatus: string;
  hasDebt: boolean;
  onlyUndelivered: boolean;
};

type SalesDraft = {
  date: string;
  customerId: string;
  managerId: string;
  category: string;
  productName: string;
  quantity: number;
  saleAmount: number;
  paymentAmount: number;
  paymentType: string;
  bonus: number;
  customerBonus: number;
  productionStage: string;
  deliveryStatus: string;
  deliveryDate: string;
  paymentStatus: string;
  qaimaStatus: string;
  qaimaDate: string;
  qaimaNumber: string;
  paperCost: number;
  plateCost: number;
  printCost: number;
  specialCutCost: number;
  knifeCost: number;
  manualWorkCost: number;
  spiralCost: number;
  poniCost: number;
  otherCost: number;
  laminationCost: number;
  notes: string;
};

type ColumnKey =
  | 'date'
  | 'customer'
  | 'manager'
  | 'category'
  | 'productName'
  | 'quantity'
  | 'saleUnitPrice'
  | 'saleAmount'
  | 'paymentAmount'
  | 'paymentType'
  | 'bonus'
  | 'customerBonus'
  | 'remainingDebt'
  | 'finalRemainingDebt'
  | 'productionStage'
  | 'deliveryStatus'
  | 'deliveryDate'
  | 'paymentStatus'
  | 'qaimaStatus'
  | 'qaimaDate'
  | 'qaimaNumber'
  | 'paperCost'
  | 'plateCost'
  | 'printCost'
  | 'specialCutCost'
  | 'knifeCost'
  | 'manualWorkCost'
  | 'spiralCost'
  | 'poniCost'
  | 'otherCost'
  | 'laminationCost'
  | 'totalCost'
  | 'profit'
  | 'profitPercent'
  | 'notes';

type ColumnDef = {
  key: ColumnKey;
  label: string;
  sticky?: { side: 'left' | 'right'; offset: number };
  editable?: boolean;
};

const STORAGE_KEY = 'bestapp.sales.visible-columns';

const columns: ColumnDef[] = [
  { key: 'date', label: 'Tarix', sticky: { side: 'left', offset: 0 }, editable: true },
  { key: 'customer', label: 'Müştəri', sticky: { side: 'left', offset: 120 }, editable: true },
  { key: 'manager', label: 'Menecer', editable: true },
  { key: 'category', label: 'Kateqoriya', editable: true },
  { key: 'productName', label: 'Məhsul', sticky: { side: 'left', offset: 360 }, editable: true },
  { key: 'quantity', label: 'Say', editable: true },
  { key: 'saleUnitPrice', label: 'Satış qiy.' },
  { key: 'saleAmount', label: 'Satış məb.', editable: true },
  { key: 'paymentAmount', label: 'Ödəniş', editable: true },
  { key: 'paymentType', label: 'Ödəniş növü', editable: true },
  { key: 'bonus', label: 'Bonus', editable: true },
  { key: 'customerBonus', label: 'Bonus Müştəri', editable: true },
  { key: 'remainingDebt', label: 'Qalıq', sticky: { side: 'right', offset: 280 } },
  { key: 'finalRemainingDebt', label: 'Son qalıq', sticky: { side: 'right', offset: 140 } },
  { key: 'productionStage', label: 'İstehsal', editable: true },
  { key: 'deliveryStatus', label: 'Status', editable: true },
  { key: 'deliveryDate', label: 'Təhvil tarixi', editable: true },
  { key: 'paymentStatus', label: 'Ödəniş statusu', editable: true },
  { key: 'qaimaStatus', label: 'Qaimə', editable: true },
  { key: 'qaimaDate', label: 'Qaimə tarix', editable: true },
  { key: 'qaimaNumber', label: 'Qaimə nömrə', editable: true },
  { key: 'paperCost', label: 'Kağız', editable: true },
  { key: 'plateCost', label: 'Forma', editable: true },
  { key: 'printCost', label: 'Çap', editable: true },
  { key: 'specialCutCost', label: 'Xüsusi kəsim', editable: true },
  { key: 'knifeCost', label: 'Bıçaq', editable: true },
  { key: 'manualWorkCost', label: 'Əl işi', editable: true },
  { key: 'spiralCost', label: 'Spiral', editable: true },
  { key: 'poniCost', label: 'Poni', editable: true },
  { key: 'otherCost', label: 'Digər', editable: true },
  { key: 'laminationCost', label: 'Laminasiya', editable: true },
  { key: 'totalCost', label: 'Ümumi xərc' },
  { key: 'profit', label: 'Xeyir', sticky: { side: 'right', offset: 0 } },
  { key: 'profitPercent', label: 'Xeyir faiz' },
  { key: 'notes', label: 'Qeyd', editable: true }
];

const initialQuery: QueryState = {
  page: 1,
  limit: 25,
  search: '',
  sortBy: 'date',
  sortOrder: 'desc',
  dateFrom: '',
  dateTo: '',
  customerId: '',
  managerId: '',
  category: '',
  paymentType: '',
  productionStage: '',
  deliveryStatus: '',
  qaimaStatus: '',
  paymentStatus: '',
  hasDebt: false,
  onlyUndelivered: false
};

function toInputDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createDraft(row: SalesEntryItem): SalesDraft {
  return {
    date: toInputDate(row.date),
    customerId: row.customerId,
    managerId: row.managerId ?? '',
    category: row.category ?? '',
    productName: row.productName,
    quantity: Number(row.quantity ?? 0),
    saleAmount: Number(row.saleAmount ?? 0),
    paymentAmount: Number(row.paymentAmount ?? 0),
    paymentType: row.paymentType ?? SalesPaymentType.NEGD,
    bonus: Number(row.bonus ?? 0),
    customerBonus: Number(row.customerBonus ?? 0),
    productionStage: row.productionStage ?? '',
    deliveryStatus: row.deliveryStatus ?? SalesDeliveryStatus.SIFARIS,
    deliveryDate: toInputDate(row.deliveryDate),
    paymentStatus: row.paymentStatus ?? '',
    qaimaStatus: row.qaimaStatus ?? '',
    qaimaDate: toInputDate(row.qaimaDate),
    qaimaNumber: row.qaimaNumber ?? '',
    paperCost: Number(row.paperCost ?? 0),
    plateCost: Number(row.plateCost ?? 0),
    printCost: Number(row.printCost ?? 0),
    specialCutCost: Number(row.specialCutCost ?? 0),
    knifeCost: Number(row.knifeCost ?? 0),
    manualWorkCost: Number(row.manualWorkCost ?? 0),
    spiralCost: Number(row.spiralCost ?? 0),
    poniCost: Number(row.poniCost ?? 0),
    otherCost: Number(row.otherCost ?? 0),
    laminationCost: Number(row.laminationCost ?? 0),
    notes: row.notes ?? ''
  };
}

function createQuickRow(): SalesDraft {
  return {
    date: toInputDate(new Date().toISOString()),
    customerId: '',
    managerId: '',
    category: '',
    productName: '',
    quantity: 1,
    saleAmount: 0,
    paymentAmount: 0,
    paymentType: SalesPaymentType.NEGD,
    bonus: 0,
    customerBonus: 0,
    productionStage: '',
    deliveryStatus: SalesDeliveryStatus.SIFARIS,
    deliveryDate: '',
    paymentStatus: '',
    qaimaStatus: '',
    qaimaDate: '',
    qaimaNumber: '',
    paperCost: 0,
    plateCost: 0,
    printCost: 0,
    specialCutCost: 0,
    knifeCost: 0,
    manualWorkCost: 0,
    spiralCost: 0,
    poniCost: 0,
    otherCost: 0,
    laminationCost: 0,
    notes: ''
  };
}

function getDraftCalculated(draft: SalesDraft) {
  const totalCost =
    draft.paperCost +
    draft.plateCost +
    draft.printCost +
    draft.specialCutCost +
    draft.knifeCost +
    draft.manualWorkCost +
    draft.spiralCost +
    draft.poniCost +
    draft.otherCost +
    draft.laminationCost;
  const profit = draft.saleAmount - draft.bonus - draft.customerBonus - totalCost;
  const profitPercent = totalCost > 0 ? (profit / totalCost) * 100 : 0;
  const remainingDebt = draft.saleAmount - draft.paymentAmount - draft.customerBonus;
  const finalRemainingDebt = remainingDebt - draft.bonus;
  const saleUnitPrice = draft.quantity > 0 ? draft.saleAmount / draft.quantity : 0;

  return { totalCost, profit, profitPercent, remainingDebt, finalRemainingDebt, saleUnitPrice };
}

function summaryCards(summary: SalesGridSummary | null) {
  return [
    { label: 'Satış məbləği cəmi', value: formatCurrency(summary?.totalSaleAmount) },
    { label: 'Ödəniş cəmi', value: formatCurrency(summary?.totalPaymentAmount) },
    { label: 'Bonus cəmi', value: formatCurrency(summary?.totalBonus) },
    { label: 'Bonus Müştəri cəmi', value: formatCurrency(summary?.totalCustomerBonus) },
    { label: 'Qalıq cəmi', value: formatCurrency(summary?.totalRemainingDebt) },
    { label: 'Son qalıq cəmi', value: formatCurrency(summary?.totalFinalRemainingDebt) },
    { label: 'Ümumi xərc cəmi', value: formatCurrency(summary?.totalCost) },
    { label: 'Xeyir cəmi', value: formatCurrency(summary?.totalProfit) },
    { label: 'Ortalama xeyir faiz', value: formatPercent(summary?.averageProfitPercent) }
  ];
}

function getStoredColumns() {
  if (typeof window === 'undefined') {
    return columns.map((column) => column.key);
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return columns.map((column) => column.key);
  }

  try {
    const parsed = JSON.parse(raw) as ColumnKey[];
    return parsed.filter((key) => columns.some((column) => column.key === key));
  } catch {
    return columns.map((column) => column.key);
  }
}

function stickyCellClass(sticky?: ColumnDef['sticky']) {
  return sticky ? 'sticky z-10' : '';
}

function stickyCellStyle(sticky?: ColumnDef['sticky']): CSSProperties | undefined {
  if (!sticky) return undefined;
  return sticky.side === 'left' ? { left: sticky.offset } : { right: sticky.offset };
}

export function SalesPage() {
  const toast = useToast();
  const [rows, setRows] = useState<SalesEntryItem[]>([]);
  const [summary, setSummary] = useState<SalesGridSummary | null>(null);
  const [meta, setMeta] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [managers, setManagers] = useState<UserSummary[]>([]);
  const [query, setQuery] = useState<QueryState>(initialQuery);
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(() => getStoredColumns());
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SalesDraft | null>(null);
  const [quickRowOpen, setQuickRowOpen] = useState(false);
  const [quickRow, setQuickRow] = useState<SalesDraft>(createQuickRow());
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState<CreateCustomerDto>({ name: '', phone: '', companyName: '' });
  const [loading, setLoading] = useState(true);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [savingQuickRow, setSavingQuickRow] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeColumns = useMemo(() => columns.filter((column) => visibleColumns.includes(column.key)), [visibleColumns]);
  const totals = useMemo(() => summaryCards(summary), [summary]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleColumns));
    }
  }, [visibleColumns]);

  const load = async (nextQuery = query) => {
    setLoading(true);
    setError(null);
    try {
      const [sales, salesSummary, customerList] = await Promise.all([
        salesClient.list(nextQuery),
        salesClient.summary(nextQuery),
        customersClient.list({ page: 1, limit: 200 })
      ]);

      setRows(sales.data);
      setMeta(sales.meta);
      setSummary(salesSummary);
      setCustomers(customerList.data);

      try {
        const userRows = await usersClient.list();
        setManagers(userRows);
      } catch {
        const map = new Map<string, UserSummary>();
        sales.data.forEach((row) => {
          if (row.manager?.id) map.set(row.manager.id, row.manager);
        });
        setManagers(Array.from(map.values()));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Satış jurnalı yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(query);
  }, [
    query.page,
    query.limit,
    query.search,
    query.dateFrom,
    query.dateTo,
    query.customerId,
    query.managerId,
    query.category,
    query.paymentType,
    query.productionStage,
    query.deliveryStatus,
    query.qaimaStatus,
    query.paymentStatus,
    query.hasDebt,
    query.onlyUndelivered
  ]);

  const updateQuery = (patch: Partial<QueryState>) => {
    setQuery((current) => ({
      ...current,
      ...patch,
      page: patch.page ?? (Object.keys(patch).some((key) => key !== 'page') ? 1 : current.page)
    }));
  };

  const startEdit = (row: SalesEntryItem) => {
    setEditingId(row.id);
    setDraft(createDraft(row));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const persistRow = async (id: string, currentDraft: SalesDraft) => {
    if (!currentDraft.customerId || !currentDraft.productName.trim() || currentDraft.quantity <= 0 || currentDraft.saleAmount <= 0) {
      toast.error('Müştəri, Məhsul, Say və Satış məbləği vacibdir');
      return;
    }

    setSavingRowId(id);
    try {
      await salesClient.update(id, {
        date: currentDraft.date || undefined,
        customerId: currentDraft.customerId,
        managerId: currentDraft.managerId || undefined,
        category: currentDraft.category || undefined,
        productName: currentDraft.productName,
        quantity: currentDraft.quantity,
        saleAmount: currentDraft.saleAmount,
        paymentAmount: currentDraft.paymentAmount,
        paymentType: currentDraft.paymentType || undefined,
        bonus: currentDraft.bonus,
        customerBonus: currentDraft.customerBonus,
        productionStage: currentDraft.productionStage || undefined,
        deliveryStatus: currentDraft.deliveryStatus || undefined,
        deliveryDate: currentDraft.deliveryDate || undefined,
        paymentStatus: currentDraft.paymentStatus || undefined,
        qaimaStatus: currentDraft.qaimaStatus || undefined,
        qaimaDate: currentDraft.qaimaDate || undefined,
        qaimaNumber: currentDraft.qaimaNumber || undefined,
        paperCost: currentDraft.paperCost,
        plateCost: currentDraft.plateCost,
        printCost: currentDraft.printCost,
        specialCutCost: currentDraft.specialCutCost,
        knifeCost: currentDraft.knifeCost,
        manualWorkCost: currentDraft.manualWorkCost,
        spiralCost: currentDraft.spiralCost,
        poniCost: currentDraft.poniCost,
        otherCost: currentDraft.otherCost,
        laminationCost: currentDraft.laminationCost,
        notes: currentDraft.notes || undefined
      });
      toast.success('Satış sətri yeniləndi');
      cancelEdit();
      await load(query);
    } catch (e) {
      toast.error('Satış sətri saxlanmadı', e instanceof Error ? e.message : 'Xəta baş verdi');
    } finally {
      setSavingRowId(null);
    }
  };

  const persistQuickRow = async () => {
    if (!quickRow.customerId || !quickRow.productName.trim() || quickRow.quantity <= 0 || quickRow.saleAmount <= 0) {
      toast.error('Yeni satış sətri üçün Müştəri, Məhsul, Say və Satış məbləği vacibdir');
      return;
    }

    setSavingQuickRow(true);
    try {
      const payload: QuickCreateSalesEntryDto = {
        customerId: quickRow.customerId,
        managerId: quickRow.managerId || undefined,
        date: quickRow.date || undefined,
        productName: quickRow.productName,
        quantity: quickRow.quantity,
        saleAmount: quickRow.saleAmount
      };
      await salesClient.quickCreate(payload);
      toast.success('Yeni satış sətri yaradıldı');
      setQuickRowOpen(false);
      setQuickRow(createQuickRow());
      await load(query);
    } catch (e) {
      toast.error('Yeni satış sətri yaradılmadı', e instanceof Error ? e.message : 'Xəta baş verdi');
    } finally {
      setSavingQuickRow(false);
    }
  };

  const saveCustomer = async () => {
    if (!newCustomer.name?.trim()) {
      toast.error('Müştəri adı vacibdir');
      return;
    }

    setSavingCustomer(true);
    try {
      const created = await customersClient.create(newCustomer);
      const createdId = (created as { id?: string }).id;
      toast.success('Müştəri yaradıldı');
      setCustomerModalOpen(false);
      setNewCustomer({ name: '', phone: '', companyName: '' });
      await load(query);
      if (createdId) {
        setQuickRow((current) => ({ ...current, customerId: createdId }));
        setDraft((current) => (current ? { ...current, customerId: createdId } : current));
      }
    } catch (e) {
      toast.error('Müştəri yaradılmadı', e instanceof Error ? e.message : 'Xəta baş verdi');
    } finally {
      setSavingCustomer(false);
    }
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      const blob = await salesClient.export(query);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'satis-export.xlsx';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('Export alınmadı', e instanceof Error ? e.message : 'Xəta baş verdi');
    } finally {
      setExporting(false);
    }
  };

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns((current) => {
      if (current.includes(key)) {
        const next = current.filter((item) => item !== key);
        return next.length ? next : current;
      }
      return [...current, key];
    });
  };

  if (loading && !rows.length && !summary) {
    return <LoadingState rows={8} />;
  }

  if (error) {
    return <ErrorState description={error} onRetry={() => void load(query)} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Satış"
        description="Əsas iş jurnalı: satış, ödəniş, xərc, qalıq və xeyir bir cədvəldə."
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowColumnSelector(true)}>
              Sütunları seç
            </Button>
            <Button variant="secondary" onClick={() => void exportExcel()} disabled={exporting}>
              {exporting ? 'Hazırlanır...' : 'Excel-ə çıxar'}
            </Button>
            <Button variant="secondary" onClick={() => setCustomerModalOpen(true)}>
              Tez müştəri yarat
            </Button>
            <Button
              onClick={() => {
                setQuickRowOpen(true);
                setQuickRow(createQuickRow());
              }}
            >
              Yeni satış sətri
            </Button>
          </>
        }
      />

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {totals.map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">{item.label}</div>
            <div className="mt-1 text-sm font-semibold text-slate-950">{item.value}</div>
          </div>
        ))}
      </div>

      <FilterBar>
        <div className="w-full lg:w-48">
          <Input value={query.search ?? ''} onChange={(event) => updateQuery({ search: event.target.value })} placeholder="Axtarış" />
        </div>
        <div className="w-full lg:w-36">
          <Input type="date" value={query.dateFrom ?? ''} onChange={(event) => updateQuery({ dateFrom: event.target.value })} />
        </div>
        <div className="w-full lg:w-36">
          <Input type="date" value={query.dateTo ?? ''} onChange={(event) => updateQuery({ dateTo: event.target.value })} />
        </div>
        <SelectBox value={query.customerId} onChange={(value) => updateQuery({ customerId: value })} options={customers.map((item) => ({ value: item.id, label: item.name }))} placeholder="Müştəri" />
        <SelectBox value={query.managerId} onChange={(value) => updateQuery({ managerId: value })} options={managers.map((item) => ({ value: item.id, label: item.fullName }))} placeholder="Menecer" />
        <div className="w-full lg:w-40">
          <Input value={query.category ?? ''} onChange={(event) => updateQuery({ category: event.target.value })} placeholder="Kateqoriya" />
        </div>
        <SelectBox value={query.paymentType} onChange={(value) => updateQuery({ paymentType: value })} options={Object.entries(salesPaymentTypeLabels).map(([value, label]) => ({ value, label }))} placeholder="Ödəniş növü" />
        <SelectBox value={query.productionStage} onChange={(value) => updateQuery({ productionStage: value })} options={Object.entries(salesProductionStageLabels).map(([value, label]) => ({ value, label }))} placeholder="İstehsal" />
        <SelectBox value={query.deliveryStatus} onChange={(value) => updateQuery({ deliveryStatus: value })} options={Object.entries(salesDeliveryStatusLabels).map(([value, label]) => ({ value, label }))} placeholder="Status" />
        <SelectBox value={query.qaimaStatus} onChange={(value) => updateQuery({ qaimaStatus: value })} options={Object.entries(salesQaimaLabels).map(([value, label]) => ({ value, label }))} placeholder="Qaimə" />
        <SelectBox value={query.paymentStatus} onChange={(value) => updateQuery({ paymentStatus: value })} options={Object.entries(salesPaymentStatusLabels).map(([value, label]) => ({ value, label }))} placeholder="Ödəniş statusu" />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={query.hasDebt} onChange={(event) => updateQuery({ hasDebt: event.target.checked })} />
          Yalnız borclular
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={query.onlyUndelivered} onChange={(event) => updateQuery({ onlyUndelivered: event.target.checked })} />
          Yalnız təhvil verilməyənlər
        </label>
      </FilterBar>

      {!rows.length && !quickRowOpen ? (
        <EmptyState title="Satış sətri yoxdur" description="Yeni sətr əlavə etdikdən sonra jurnal burada görünəcək." />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[3200px] border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {activeColumns.map((column) => (
                    <th
                      key={column.key}
                      className={`border-b border-slate-200 px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.14em] ${stickyCellClass(column.sticky)}`}
                      style={stickyCellStyle(column.sticky)}
                    >
                      {column.label}
                    </th>
                  ))}
                  <th className="border-b border-slate-200 px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.14em]">Əməliyyat</th>
                </tr>
              </thead>
              <tbody>
                {quickRowOpen ? (
                  <SalesEditorRow
                    rowId="quick-create"
                    draft={quickRow}
                    customers={customers}
                    managers={managers}
                    columns={activeColumns}
                    saving={savingQuickRow}
                    onChange={setQuickRow}
                    onCancel={() => {
                      setQuickRowOpen(false);
                      setQuickRow(createQuickRow());
                    }}
                    onSave={() => void persistQuickRow()}
                  />
                ) : null}
                {rows.map((row) =>
                  editingId === row.id && draft ? (
                    <SalesEditorRow
                      key={row.id}
                      rowId={row.id}
                      draft={draft}
                      customers={customers}
                      managers={managers}
                      columns={activeColumns}
                      saving={savingRowId === row.id}
                      onChange={setDraft}
                      onCancel={cancelEdit}
                      onSave={() => void persistRow(row.id, draft)}
                    />
                  ) : (
                    <SalesReadRow key={row.id} row={row} columns={activeColumns} onEdit={() => startEdit(row)} />
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {totals.map((item) => (
          <div key={`footer-${item.label}`} className="rounded-2xl border border-slate-200 bg-slate-950 px-4 py-3 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-300">{item.label}</div>
            <div className="mt-1 text-sm font-semibold text-white">{item.value}</div>
          </div>
        ))}
      </div>

      <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={(page) => updateQuery({ page })} />

      <Modal open={showColumnSelector} title="Sütunları seç" description="Satış cədvəlində görünəcək sütunları seçin." onClose={() => setShowColumnSelector(false)} widthClassName="max-w-2xl">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {columns.map((column) => (
            <label key={column.key} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <input type="checkbox" checked={visibleColumns.includes(column.key)} onChange={() => toggleColumn(column.key)} />
              {column.label}
            </label>
          ))}
        </div>
      </Modal>

      <Modal open={customerModalOpen} title="Tez müştəri yarat" description="Satış jurnalından ayrılmadan yeni müştəri yaradın." onClose={() => setCustomerModalOpen(false)} widthClassName="max-w-lg">
        <div className="space-y-4">
          <Field label="Ad">
            <Input value={newCustomer.name ?? ''} onChange={(event) => setNewCustomer((current) => ({ ...current, name: event.target.value }))} />
          </Field>
          <Field label="Şirkət">
            <Input value={newCustomer.companyName ?? ''} onChange={(event) => setNewCustomer((current) => ({ ...current, companyName: event.target.value }))} />
          </Field>
          <Field label="Telefon">
            <Input value={newCustomer.phone ?? ''} onChange={(event) => setNewCustomer((current) => ({ ...current, phone: event.target.value }))} />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setCustomerModalOpen(false)}>
            Bağla
          </Button>
          <Button onClick={() => void saveCustomer()} disabled={savingCustomer}>
            {savingCustomer ? 'Saxlanılır...' : 'Yadda saxla'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function SalesReadRow({ row, columns, onEdit }: { row: SalesEntryItem; columns: ColumnDef[]; onEdit: () => void }) {
  return (
    <tr className="hover:bg-slate-50/70">
      {columns.map((column) => (
        <td
          key={column.key}
          className={`border-b border-slate-200 px-2 py-1.5 text-xs align-top ${stickyCellClass(column.sticky)} ${getReadCellClass(column.key, row)}`}
          style={stickyCellStyle(column.sticky)}
        >
          {renderReadValue(column.key, row)}
        </td>
      ))}
      <td className="border-b border-slate-200 px-2 py-1.5 text-xs">
        <Button className="h-8 rounded-lg px-3 text-xs" variant="secondary" onClick={onEdit}>
          Düzəliş
        </Button>
      </td>
    </tr>
  );
}

function SalesEditorRow({
  rowId,
  draft,
  customers,
  managers,
  columns,
  saving,
  onChange,
  onCancel,
  onSave
}: {
  rowId: string;
  draft: SalesDraft;
  customers: CustomerListItem[];
  managers: UserSummary[];
  columns: ColumnDef[];
  saving: boolean;
  onChange: (draft: SalesDraft) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const calculated = getDraftCalculated(draft);

  const updateField = <K extends keyof SalesDraft>(key: K, value: SalesDraft[K]) => {
    onChange({ ...draft, [key]: value });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onSave();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
      return;
    }

    if (event.key === 'Tab') {
      const current = event.currentTarget;
      const parent = current.closest('tr');
      if (!parent) return;
      const focusables = Array.from(parent.querySelectorAll<HTMLElement>('[data-sales-editor="true"]'));
      const index = focusables.indexOf(current);
      if (index >= 0 && index < focusables.length - 1 && !event.shiftKey) {
        event.preventDefault();
        focusables[index + 1]?.focus();
      }
      if (index > 0 && event.shiftKey) {
        event.preventDefault();
        focusables[index - 1]?.focus();
      }
    }
  };

  return (
    <tr className="bg-amber-50/60">
      {columns.map((column) => (
        <td
          key={column.key}
          className={`border-b border-slate-200 px-2 py-1.5 text-xs align-top ${stickyCellClass(column.sticky)}`}
          style={stickyCellStyle(column.sticky)}
        >
          {renderEditValue(column.key, draft, calculated, customers, managers, updateField, handleKeyDown)}
        </td>
      ))}
      <td className="border-b border-slate-200 px-2 py-1.5 text-xs">
        <div className="flex gap-2">
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

function renderReadValue(key: ColumnKey, row: SalesEntryItem): ReactNode {
  switch (key) {
    case 'date':
      return formatDateOnly(row.date);
    case 'customer':
      return row.customer?.name ?? '—';
    case 'manager':
      return row.manager?.fullName ?? '—';
    case 'category':
      return row.category ?? '—';
    case 'productName':
      return row.productName;
    case 'quantity':
      return formatNumber(row.quantity, 0);
    case 'saleUnitPrice':
      return formatCurrency(row.saleUnitPrice);
    case 'saleAmount':
      return formatCurrency(row.saleAmount);
    case 'paymentAmount':
      return formatCurrency(row.paymentAmount);
    case 'paymentType':
      return getSalesLabel(salesPaymentTypeLabels, row.paymentType);
    case 'bonus':
      return formatCurrency(row.bonus);
    case 'customerBonus':
      return formatCurrency(row.customerBonus);
    case 'remainingDebt':
      return formatCurrency(row.remainingDebt);
    case 'finalRemainingDebt':
      return formatCurrency(row.finalRemainingDebt);
    case 'productionStage':
      return getSalesLabel(salesProductionStageLabels, row.productionStage);
    case 'deliveryStatus':
      return getSalesLabel(salesDeliveryStatusLabels, row.deliveryStatus);
    case 'deliveryDate':
      return formatDateOnly(row.deliveryDate);
    case 'paymentStatus':
      return getSalesLabel(salesPaymentStatusLabels, row.paymentStatus);
    case 'qaimaStatus':
      return getSalesLabel(salesQaimaLabels, row.qaimaStatus);
    case 'qaimaDate':
      return formatDateOnly(row.qaimaDate);
    case 'qaimaNumber':
      return row.qaimaNumber ?? '—';
    case 'paperCost':
      return formatCurrency(row.paperCost);
    case 'plateCost':
      return formatCurrency(row.plateCost);
    case 'printCost':
      return formatCurrency(row.printCost);
    case 'specialCutCost':
      return formatCurrency(row.specialCutCost);
    case 'knifeCost':
      return formatCurrency(row.knifeCost);
    case 'manualWorkCost':
      return formatCurrency(row.manualWorkCost);
    case 'spiralCost':
      return formatCurrency(row.spiralCost);
    case 'poniCost':
      return formatCurrency(row.poniCost);
    case 'otherCost':
      return formatCurrency(row.otherCost);
    case 'laminationCost':
      return formatCurrency(row.laminationCost);
    case 'totalCost':
      return formatCurrency(row.totalCost);
    case 'profit':
      return formatCurrency(row.profit);
    case 'profitPercent':
      return formatPercent(row.profitPercent);
    case 'notes':
      return row.notes ?? '—';
    default:
      return '—';
  }
}

function renderEditValue(
  key: ColumnKey,
  draft: SalesDraft,
  calculated: ReturnType<typeof getDraftCalculated>,
  customers: CustomerListItem[],
  managers: UserSummary[],
  updateField: <K extends keyof SalesDraft>(key: K, value: SalesDraft[K]) => void,
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
) {
  const commonInputProps = {
    'data-sales-editor': 'true',
    onKeyDown,
    className: 'h-8 rounded-lg px-2 text-xs'
  } as const;

  switch (key) {
    case 'date':
      return <Input {...commonInputProps} type="date" value={draft.date} onChange={(event) => updateField('date', event.target.value)} />;
    case 'customer':
      return (
        <select data-sales-editor="true" onKeyDown={onKeyDown} className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs" value={draft.customerId} onChange={(event) => updateField('customerId', event.target.value)}>
          <option value="">Müştəri</option>
          {customers.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      );
    case 'manager':
      return (
        <select data-sales-editor="true" onKeyDown={onKeyDown} className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs" value={draft.managerId} onChange={(event) => updateField('managerId', event.target.value)}>
          <option value="">Menecer</option>
          {managers.map((item) => (
            <option key={item.id} value={item.id}>{item.fullName}</option>
          ))}
        </select>
      );
    case 'category':
      return <Input {...commonInputProps} value={draft.category} onChange={(event) => updateField('category', event.target.value)} />;
    case 'productName':
      return <Input {...commonInputProps} value={draft.productName} onChange={(event) => updateField('productName', event.target.value)} />;
    case 'quantity':
      return <Input {...commonInputProps} type="number" value={draft.quantity} onChange={(event) => updateField('quantity', toNumber(event.target.value))} />;
    case 'saleUnitPrice':
      return formatCurrency(calculated.saleUnitPrice);
    case 'saleAmount':
      return <Input {...commonInputProps} type="number" value={draft.saleAmount} onChange={(event) => updateField('saleAmount', toNumber(event.target.value))} />;
    case 'paymentAmount':
      return <Input {...commonInputProps} type="number" value={draft.paymentAmount} onChange={(event) => updateField('paymentAmount', toNumber(event.target.value))} />;
    case 'paymentType':
      return (
        <select data-sales-editor="true" onKeyDown={onKeyDown} className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs" value={draft.paymentType} onChange={(event) => updateField('paymentType', event.target.value)}>
          {Object.entries(salesPaymentTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      );
    case 'bonus':
      return <Input {...commonInputProps} type="number" value={draft.bonus} onChange={(event) => updateField('bonus', toNumber(event.target.value))} />;
    case 'customerBonus':
      return <Input {...commonInputProps} type="number" value={draft.customerBonus} onChange={(event) => updateField('customerBonus', toNumber(event.target.value))} />;
    case 'remainingDebt':
      return formatCurrency(calculated.remainingDebt);
    case 'finalRemainingDebt':
      return formatCurrency(calculated.finalRemainingDebt);
    case 'productionStage':
      return (
        <select data-sales-editor="true" onKeyDown={onKeyDown} className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs" value={draft.productionStage} onChange={(event) => updateField('productionStage', event.target.value)}>
          <option value="">—</option>
          {Object.entries(salesProductionStageLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      );
    case 'deliveryStatus':
      return (
        <select data-sales-editor="true" onKeyDown={onKeyDown} className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs" value={draft.deliveryStatus} onChange={(event) => updateField('deliveryStatus', event.target.value)}>
          {Object.entries(salesDeliveryStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      );
    case 'deliveryDate':
      return <Input {...commonInputProps} type="date" value={draft.deliveryDate} onChange={(event) => updateField('deliveryDate', event.target.value)} />;
    case 'paymentStatus':
      return (
        <select data-sales-editor="true" onKeyDown={onKeyDown} className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs" value={draft.paymentStatus} onChange={(event) => updateField('paymentStatus', event.target.value)}>
          <option value="">—</option>
          {Object.entries(salesPaymentStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      );
    case 'qaimaStatus':
      return (
        <select data-sales-editor="true" onKeyDown={onKeyDown} className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs" value={draft.qaimaStatus} onChange={(event) => updateField('qaimaStatus', event.target.value)}>
          <option value="">—</option>
          {Object.entries(salesQaimaLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      );
    case 'qaimaDate':
      return <Input {...commonInputProps} type="date" value={draft.qaimaDate} onChange={(event) => updateField('qaimaDate', event.target.value)} />;
    case 'qaimaNumber':
      return <Input {...commonInputProps} value={draft.qaimaNumber} onChange={(event) => updateField('qaimaNumber', event.target.value)} />;
    case 'paperCost':
      return <Input {...commonInputProps} type="number" value={draft.paperCost} onChange={(event) => updateField('paperCost', toNumber(event.target.value))} />;
    case 'plateCost':
      return <Input {...commonInputProps} type="number" value={draft.plateCost} onChange={(event) => updateField('plateCost', toNumber(event.target.value))} />;
    case 'printCost':
      return <Input {...commonInputProps} type="number" value={draft.printCost} onChange={(event) => updateField('printCost', toNumber(event.target.value))} />;
    case 'specialCutCost':
      return <Input {...commonInputProps} type="number" value={draft.specialCutCost} onChange={(event) => updateField('specialCutCost', toNumber(event.target.value))} />;
    case 'knifeCost':
      return <Input {...commonInputProps} type="number" value={draft.knifeCost} onChange={(event) => updateField('knifeCost', toNumber(event.target.value))} />;
    case 'manualWorkCost':
      return <Input {...commonInputProps} type="number" value={draft.manualWorkCost} onChange={(event) => updateField('manualWorkCost', toNumber(event.target.value))} />;
    case 'spiralCost':
      return <Input {...commonInputProps} type="number" value={draft.spiralCost} onChange={(event) => updateField('spiralCost', toNumber(event.target.value))} />;
    case 'poniCost':
      return <Input {...commonInputProps} type="number" value={draft.poniCost} onChange={(event) => updateField('poniCost', toNumber(event.target.value))} />;
    case 'otherCost':
      return <Input {...commonInputProps} type="number" value={draft.otherCost} onChange={(event) => updateField('otherCost', toNumber(event.target.value))} />;
    case 'laminationCost':
      return <Input {...commonInputProps} type="number" value={draft.laminationCost} onChange={(event) => updateField('laminationCost', toNumber(event.target.value))} />;
    case 'totalCost':
      return formatCurrency(calculated.totalCost);
    case 'profit':
      return formatCurrency(calculated.profit);
    case 'profitPercent':
      return formatPercent(calculated.profitPercent);
    case 'notes':
      return <Input {...commonInputProps} value={draft.notes} onChange={(event) => updateField('notes', event.target.value)} />;
    default:
      return '—';
  }
}

function getReadCellClass(key: ColumnKey, row: SalesEntryItem) {
  if (key === 'remainingDebt' && Number(row.remainingDebt) > 0) {
    return 'bg-amber-50 text-amber-700';
  }
  if (key === 'finalRemainingDebt' && Number(row.finalRemainingDebt) > 0) {
    return 'bg-rose-50 text-rose-700';
  }
  if (key === 'profit' && Number(row.profit) < 0) {
    return 'bg-rose-50 text-rose-700';
  }
  if (key === 'profit' && Number(row.profit) >= 0) {
    return 'bg-emerald-50 text-emerald-700';
  }
  return '';
}

function SelectBox({ value, onChange, options, placeholder }: { value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; placeholder: string }) {
  return (
    <div className="w-full lg:w-44">
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}
