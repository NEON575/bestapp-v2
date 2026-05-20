import type { CSSProperties, ReactNode } from 'react';
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
import { SalesDeliveryStatus, SalesPaymentStatus, SalesPaymentType, SalesProductionStage, QaimaStatus } from '@bestapp/shared';
import { Button, Input } from '@bestapp/ui';
import { customersClient } from '../shared/api/customers';
import { salesClient } from '../shared/api/sales';
import { usersClient } from '../shared/api/users';
import { EmptyState, ErrorState, FilterBar, LoadingState, Modal, PageHeader, Pagination } from '../shared/components';
import { formatCurrency, formatDateOnly, formatNumber, formatPercent } from '../shared/lib/format';
import {
  getSalesLabel,
  salesDeliveryStatusLabels,
  salesPaymentStatusLabels,
  salesPaymentTypeLabels,
  salesProductionStageLabels,
  salesQaimaLabels
} from '../shared/lib/salesLabels';
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

const leftSticky = {
  date: 0,
  customer: 120,
  product: 360
};

const rightSticky = {
  profit: 0,
  finalDebt: 140,
  debt: 280
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

function createQuickRow(customerId = ''): SalesDraft {
  return {
    date: toInputDate(new Date().toISOString()),
    customerId,
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

function summaryItems(summary: SalesGridSummary | null) {
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

function cellBase(sticky?: CSSProperties, extra?: string) {
  return [
    'border-b border-slate-200 bg-white px-2 py-2 text-xs text-slate-700 align-top',
    extra ?? '',
    sticky ? 'sticky z-10' : ''
  ].join(' ');
}

export function SalesPage() {
  const toast = useToast();
  const [rows, setRows] = useState<SalesEntryItem[]>([]);
  const [summary, setSummary] = useState<SalesGridSummary | null>(null);
  const [meta, setMeta] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [managers, setManagers] = useState<UserSummary[]>([]);
  const [query, setQuery] = useState<QueryState>(initialQuery);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SalesDraft | null>(null);
  const [quickRowOpen, setQuickRowOpen] = useState(false);
  const [quickRow, setQuickRow] = useState<SalesDraft>(createQuickRow());
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState<CreateCustomerDto>({ name: '', phone: '', companyName: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        const managerMap = new Map<string, UserSummary>();
        sales.data.forEach((row) => {
          if (row.manager?.id) {
            managerMap.set(row.manager.id, row.manager);
          }
        });
        setManagers(Array.from(managerMap.values()));
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

  const totals = useMemo(() => summaryItems(summary), [summary]);

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

  const saveEdit = async (id: string) => {
    if (!draft) return;
    if (!draft.customerId || !draft.productName.trim() || draft.quantity <= 0 || draft.saleAmount <= 0) {
      toast.error('Sətri saxlamaq üçün Müştəri, Məhsul, Say və Satış məb. vacibdir');
      return;
    }

    setSaving(true);
    try {
      await salesClient.update(id, {
        date: draft.date || undefined,
        customerId: draft.customerId,
        managerId: draft.managerId || undefined,
        category: draft.category || undefined,
        productName: draft.productName,
        quantity: draft.quantity,
        saleAmount: draft.saleAmount,
        paymentAmount: draft.paymentAmount,
        paymentType: draft.paymentType || undefined,
        bonus: draft.bonus,
        customerBonus: draft.customerBonus,
        productionStage: draft.productionStage || undefined,
        deliveryStatus: draft.deliveryStatus || undefined,
        deliveryDate: draft.deliveryDate || undefined,
        paymentStatus: draft.paymentStatus || undefined,
        qaimaStatus: draft.qaimaStatus || undefined,
        qaimaDate: draft.qaimaDate || undefined,
        qaimaNumber: draft.qaimaNumber || undefined,
        paperCost: draft.paperCost,
        plateCost: draft.plateCost,
        printCost: draft.printCost,
        specialCutCost: draft.specialCutCost,
        knifeCost: draft.knifeCost,
        manualWorkCost: draft.manualWorkCost,
        spiralCost: draft.spiralCost,
        poniCost: draft.poniCost,
        otherCost: draft.otherCost,
        laminationCost: draft.laminationCost,
        notes: draft.notes || undefined
      });
      toast.success('Satış sətri yeniləndi');
      cancelEdit();
      await load(query);
    } catch (e) {
      toast.error('Sətri yeniləmək alınmadı', e instanceof Error ? e.message : 'Xəta baş verdi');
    } finally {
      setSaving(false);
    }
  };

  const saveQuickRow = async () => {
    if (!quickRow.customerId || !quickRow.productName.trim() || quickRow.quantity <= 0 || quickRow.saleAmount <= 0) {
      toast.error('Yeni satış sətri üçün Müştəri, Məhsul, Say və Satış məb. vacibdir');
      return;
    }

    setSaving(true);
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
      toast.error('Yeni sətri yaratmaq alınmadı', e instanceof Error ? e.message : 'Xəta baş verdi');
    } finally {
      setSaving(false);
    }
  };

  const saveCustomer = async () => {
    if (!newCustomer.name?.trim()) {
      toast.error('Müştəri adı vacibdir');
      return;
    }

    setSaving(true);
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
      toast.error('Müştəri yaratmaq alınmadı', e instanceof Error ? e.message : 'Xəta baş verdi');
    } finally {
      setSaving(false);
    }
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
        description="Əsas iş jurnalı: satış sətri, ödəniş, xərc, qalıq və xeyir bir cədvəldə."
        actions={
          <>
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
        <EmptyState title="Satış sətri yoxdur" description="Yeni sətri əlavə edib jurnalı real iş prosesinə uyğun doldura bilərsiniz." />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[3200px] border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {[
                    'Tarix',
                    'Müştəri',
                    'Menecer',
                    'Kateqoriya',
                    'Məhsul',
                    'Say',
                    'Satış qiy.',
                    'Satış məb.',
                    'Ödəniş',
                    'Ödəniş növü',
                    'Bonus',
                    'Bonus Müştəri',
                    'Qalıq',
                    'Son qalıq',
                    'İstehsal',
                    'Status',
                    'Təhvil tarixi',
                    'Ödəniş statusu',
                    'Qaimə',
                    'Qaimə tarix',
                    'Qaimə nömrə',
                    'Kağız',
                    'Forma',
                    'Çap',
                    'Xüsusi kəsim',
                    'Bıçaq',
                    'Əl işi',
                    'Spiral',
                    'Poni',
                    'Digər',
                    'Laminasiya',
                    'Ümumi xərc',
                    'Xeyir',
                    'Xeyir faiz',
                    'Qeyd',
                    'Əməliyyat'
                  ].map((header, index) => {
                    const stickyStyle =
                      index === 0
                        ? { left: leftSticky.date }
                        : index === 1
                          ? { left: leftSticky.customer }
                          : index === 4
                            ? { left: leftSticky.product }
                            : index === 12
                              ? { right: rightSticky.debt }
                              : index === 13
                                ? { right: rightSticky.finalDebt }
                                : index === 32
                                  ? { right: rightSticky.profit }
                                  : undefined;

                    return (
                      <th
                        key={header}
                        className={`border-b border-slate-200 px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] ${
                          stickyStyle ? 'sticky z-20 bg-slate-50' : ''
                        }`}
                        style={stickyStyle}
                      >
                        {header}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {quickRowOpen ? (
                  <SalesEditRow
                    draft={quickRow}
                    customers={customers}
                    managers={managers}
                    onChange={setQuickRow}
                    onCancel={() => {
                      setQuickRowOpen(false);
                      setQuickRow(createQuickRow());
                    }}
                    onSave={() => void saveQuickRow()}
                    saving={saving}
                    stickyLeft={leftSticky}
                    stickyRight={rightSticky}
                  />
                ) : null}
                {rows.map((row) =>
                  editingId === row.id && draft ? (
                    <SalesEditRow
                      key={row.id}
                      draft={draft}
                      customers={customers}
                      managers={managers}
                      onChange={setDraft}
                      onCancel={cancelEdit}
                      onSave={() => void saveEdit(row.id)}
                      saving={saving}
                      stickyLeft={leftSticky}
                      stickyRight={rightSticky}
                    />
                  ) : (
                    <SalesReadRow key={row.id} row={row} onEdit={() => startEdit(row)} stickyLeft={leftSticky} stickyRight={rightSticky} />
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

      <Modal open={customerModalOpen} title="Tez müştəri yarat" description="Satış sətirindən ayrılmadan yeni müştəri yaradın." onClose={() => setCustomerModalOpen(false)} widthClassName="max-w-lg">
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
          <Button onClick={() => void saveCustomer()} disabled={saving}>
            {saving ? 'Saxlanır...' : 'Yadda saxla'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

type EditRowProps = {
  draft: SalesDraft;
  customers: CustomerListItem[];
  managers: UserSummary[];
  onChange: (draft: SalesDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  stickyLeft: typeof leftSticky;
  stickyRight: typeof rightSticky;
};

function SalesEditRow({ draft, customers, managers, onChange, onSave, onCancel, saving, stickyLeft, stickyRight }: EditRowProps) {
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
  const debt = draft.saleAmount - draft.paymentAmount - draft.customerBonus;
  const finalDebt = debt - draft.bonus;
  const unitPrice = draft.quantity > 0 ? draft.saleAmount / draft.quantity : 0;

  const setField = <K extends keyof SalesDraft>(key: K, value: SalesDraft[K]) => {
    onChange({ ...draft, [key]: value });
  };

  return (
    <tr className="bg-amber-50/60">
      <StickyCell left={stickyLeft.date}>
        <Input type="date" className="h-9 rounded-lg px-2" value={draft.date} onChange={(event) => setField('date', event.target.value)} />
      </StickyCell>
      <StickyCell left={stickyLeft.customer}>
        <select className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2" value={draft.customerId} onChange={(event) => setField('customerId', event.target.value)}>
          <option value="">Müştəri</option>
          {customers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </StickyCell>
      <PlainCell>
        <select className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2" value={draft.managerId} onChange={(event) => setField('managerId', event.target.value)}>
          <option value="">Menecer</option>
          {managers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.fullName}
            </option>
          ))}
        </select>
      </PlainCell>
      <PlainCell>
        <Input className="h-9 rounded-lg px-2" value={draft.category} onChange={(event) => setField('category', event.target.value)} />
      </PlainCell>
      <StickyCell left={stickyLeft.product}>
        <Input className="h-9 rounded-lg px-2" value={draft.productName} onChange={(event) => setField('productName', event.target.value)} />
      </StickyCell>
      <PlainCell>
        <Input className="h-9 rounded-lg px-2" type="number" value={draft.quantity} onChange={(event) => setField('quantity', toNumber(event.target.value))} />
      </PlainCell>
      <PlainCell>{formatCurrency(unitPrice)}</PlainCell>
      <PlainCell>
        <Input className="h-9 rounded-lg px-2" type="number" value={draft.saleAmount} onChange={(event) => setField('saleAmount', toNumber(event.target.value))} />
      </PlainCell>
      <PlainCell>
        <Input className="h-9 rounded-lg px-2" type="number" value={draft.paymentAmount} onChange={(event) => setField('paymentAmount', toNumber(event.target.value))} />
      </PlainCell>
      <PlainCell>
        <select className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2" value={draft.paymentType} onChange={(event) => setField('paymentType', event.target.value)}>
          {Object.entries(salesPaymentTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </PlainCell>
      <PlainCell>
        <Input className="h-9 rounded-lg px-2" type="number" value={draft.bonus} onChange={(event) => setField('bonus', toNumber(event.target.value))} />
      </PlainCell>
      <PlainCell>
        <Input className="h-9 rounded-lg px-2" type="number" value={draft.customerBonus} onChange={(event) => setField('customerBonus', toNumber(event.target.value))} />
      </PlainCell>
      <StickyCell right={stickyRight.debt}>{formatCurrency(debt)}</StickyCell>
      <StickyCell right={stickyRight.finalDebt}>{formatCurrency(finalDebt)}</StickyCell>
      <PlainCell>
        <select className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2" value={draft.productionStage} onChange={(event) => setField('productionStage', event.target.value)}>
          <option value="">—</option>
          {Object.entries(salesProductionStageLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </PlainCell>
      <PlainCell>
        <select className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2" value={draft.deliveryStatus} onChange={(event) => setField('deliveryStatus', event.target.value)}>
          {Object.entries(salesDeliveryStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </PlainCell>
      <PlainCell>
        <Input className="h-9 rounded-lg px-2" type="date" value={draft.deliveryDate} onChange={(event) => setField('deliveryDate', event.target.value)} />
      </PlainCell>
      <PlainCell>
        <select className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2" value={draft.paymentStatus} onChange={(event) => setField('paymentStatus', event.target.value)}>
          <option value="">—</option>
          {Object.entries(salesPaymentStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </PlainCell>
      <PlainCell>
        <select className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2" value={draft.qaimaStatus} onChange={(event) => setField('qaimaStatus', event.target.value)}>
          <option value="">—</option>
          {Object.entries(salesQaimaLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </PlainCell>
      <PlainCell>
        <Input className="h-9 rounded-lg px-2" type="date" value={draft.qaimaDate} onChange={(event) => setField('qaimaDate', event.target.value)} />
      </PlainCell>
      <PlainCell>
        <Input className="h-9 rounded-lg px-2" value={draft.qaimaNumber} onChange={(event) => setField('qaimaNumber', event.target.value)} />
      </PlainCell>
      {(['paperCost', 'plateCost', 'printCost', 'specialCutCost', 'knifeCost', 'manualWorkCost', 'spiralCost', 'poniCost', 'otherCost', 'laminationCost'] as const).map((field) => (
        <PlainCell key={field}>
          <Input className="h-9 rounded-lg px-2" type="number" value={draft[field]} onChange={(event) => setField(field, toNumber(event.target.value))} />
        </PlainCell>
      ))}
      <PlainCell>{formatCurrency(totalCost)}</PlainCell>
      <StickyCell right={stickyRight.profit}>{formatCurrency(profit)}</StickyCell>
      <PlainCell>{formatPercent(profitPercent)}</PlainCell>
      <PlainCell>
        <Input className="h-9 rounded-lg px-2" value={draft.notes} onChange={(event) => setField('notes', event.target.value)} />
      </PlainCell>
      <PlainCell>
        <div className="flex gap-2">
          <Button className="h-9 rounded-lg px-3 text-xs" onClick={onSave} disabled={saving}>
            {saving ? '...' : 'Yadda saxla'}
          </Button>
          <Button className="h-9 rounded-lg px-3 text-xs" variant="secondary" onClick={onCancel}>
            Bağla
          </Button>
        </div>
      </PlainCell>
    </tr>
  );
}

function SalesReadRow({
  row,
  onEdit,
  stickyLeft,
  stickyRight
}: {
  row: SalesEntryItem;
  onEdit: () => void;
  stickyLeft: typeof leftSticky;
  stickyRight: typeof rightSticky;
}) {
  const statusTone =
    row.deliveryStatus === SalesDeliveryStatus.HAZIR
      ? 'bg-emerald-50 text-emerald-700'
      : row.deliveryStatus === SalesDeliveryStatus.TEHVIL
        ? 'bg-sky-50 text-sky-700'
        : row.deliveryStatus === SalesDeliveryStatus.LEGV
          ? 'bg-rose-50 text-rose-700'
          : 'bg-amber-50 text-amber-700';

  return (
    <tr className="hover:bg-slate-50/70">
      <StickyCell left={stickyLeft.date}>{formatDateOnly(row.date)}</StickyCell>
      <StickyCell left={stickyLeft.customer}>{row.customer?.name ?? '—'}</StickyCell>
      <PlainCell>{row.manager?.fullName ?? '—'}</PlainCell>
      <PlainCell>{row.category ?? '—'}</PlainCell>
      <StickyCell left={stickyLeft.product}>{row.productName}</StickyCell>
      <PlainCell>{formatNumber(row.quantity, 0)}</PlainCell>
      <PlainCell>{formatCurrency(row.saleUnitPrice)}</PlainCell>
      <PlainCell>{formatCurrency(row.saleAmount)}</PlainCell>
      <PlainCell>{formatCurrency(row.paymentAmount)}</PlainCell>
      <PlainCell>{getSalesLabel(salesPaymentTypeLabels, row.paymentType)}</PlainCell>
      <PlainCell>{formatCurrency(row.bonus)}</PlainCell>
      <PlainCell>{formatCurrency(row.customerBonus)}</PlainCell>
      <StickyCell right={stickyRight.debt} className={row.remainingDebt > 0 ? 'bg-amber-50 text-amber-700' : ''}>
        {formatCurrency(row.remainingDebt)}
      </StickyCell>
      <StickyCell right={stickyRight.finalDebt} className={row.finalRemainingDebt > 0 ? 'bg-rose-50 text-rose-700' : ''}>
        {formatCurrency(row.finalRemainingDebt)}
      </StickyCell>
      <PlainCell>{getSalesLabel(salesProductionStageLabels, row.productionStage)}</PlainCell>
      <PlainCell>
        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusTone}`}>{getSalesLabel(salesDeliveryStatusLabels, row.deliveryStatus)}</span>
      </PlainCell>
      <PlainCell>{formatDateOnly(row.deliveryDate)}</PlainCell>
      <PlainCell>{getSalesLabel(salesPaymentStatusLabels, row.paymentStatus)}</PlainCell>
      <PlainCell>{getSalesLabel(salesQaimaLabels, row.qaimaStatus)}</PlainCell>
      <PlainCell>{formatDateOnly(row.qaimaDate)}</PlainCell>
      <PlainCell>{row.qaimaNumber ?? '—'}</PlainCell>
      <PlainCell>{formatCurrency(row.paperCost)}</PlainCell>
      <PlainCell>{formatCurrency(row.plateCost)}</PlainCell>
      <PlainCell>{formatCurrency(row.printCost)}</PlainCell>
      <PlainCell>{formatCurrency(row.specialCutCost)}</PlainCell>
      <PlainCell>{formatCurrency(row.knifeCost)}</PlainCell>
      <PlainCell>{formatCurrency(row.manualWorkCost)}</PlainCell>
      <PlainCell>{formatCurrency(row.spiralCost)}</PlainCell>
      <PlainCell>{formatCurrency(row.poniCost)}</PlainCell>
      <PlainCell>{formatCurrency(row.otherCost)}</PlainCell>
      <PlainCell>{formatCurrency(row.laminationCost)}</PlainCell>
      <PlainCell>{formatCurrency(row.totalCost)}</PlainCell>
      <StickyCell right={stickyRight.profit} className={row.profit < 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}>
        {formatCurrency(row.profit)}
      </StickyCell>
      <PlainCell>{formatPercent(row.profitPercent)}</PlainCell>
      <PlainCell>{row.notes ?? '—'}</PlainCell>
      <PlainCell>
        <Button className="h-8 rounded-lg px-3 text-xs" variant="secondary" onClick={onEdit}>
          Düzəliş
        </Button>
      </PlainCell>
    </tr>
  );
}

function StickyCell({
  left,
  right,
  children,
  className
}: {
  left?: number;
  right?: number;
  children: ReactNode;
  className?: string;
}) {
  const style: CSSProperties = {
    ...(left != null ? { left } : {}),
    ...(right != null ? { right } : {})
  };

  return (
    <td className={cellBase(style, className)} style={style}>
      {children}
    </td>
  );
}

function PlainCell({ children }: { children: ReactNode }) {
  return <td className={cellBase()}>{children}</td>;
}

function SelectBox({
  value,
  onChange,
  options,
  placeholder
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
}) {
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
