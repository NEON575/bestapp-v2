import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CustomerListItem, CustomerSummary, SalesDashboardSummary, SalesEntryItem, SalesEntryQueryDto } from '@bestapp/shared';
import { SalesDeliveryStatus, SalesPaymentType } from '@bestapp/shared';
import { BadgeDollarSign, FileClock, PackageCheck, Wallet } from 'lucide-react';
import { Button, Input } from '@bestapp/ui';
import { customersClient } from '../shared/api/customers';
import { salesClient } from '../shared/api/sales';
import {
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  StatCard,
  StatusBadge
} from '../shared/components';
import { formatCurrency, formatDateOnly, formatNumber, formatPercent } from '../shared/lib/format';
import { useToast } from '../shared/toast/toast-context';

type QueryState = SalesEntryQueryDto & {
  customerId: string;
  paymentType: string;
  deliveryStatus: string;
  hasDebt: boolean;
};

type SalesFormState = {
  customerId: string;
  category: string;
  productName: string;
  quantity: number;
  saleAmount: number;
  paymentAmount: number;
  paymentType: string;
  bonus: number;
  customerBonus: number;
  paperCost: number;
  plateCost: number;
  printCost: number;
  laminationCost: number;
  notes: string;
};

const initialForm: SalesFormState = {
  customerId: '',
  category: '',
  productName: '',
  quantity: 1,
  saleAmount: 0,
  paymentAmount: 0,
  paymentType: SalesPaymentType.NEGD,
  bonus: 0,
  customerBonus: 0,
  paperCost: 0,
  plateCost: 0,
  printCost: 0,
  laminationCost: 0,
  notes: ''
};

const paymentOptions = [
  { value: '', label: 'Hamısı' },
  { value: SalesPaymentType.HESAB, label: 'Hesab' },
  { value: SalesPaymentType.KART, label: 'Kart' },
  { value: SalesPaymentType.NEGD, label: 'Nəğd' },
  { value: SalesPaymentType.KASSA, label: 'Kassa' }
];

const deliveryOptions = [
  { value: '', label: 'Bütün statuslar' },
  { value: SalesDeliveryStatus.SIFARIS, label: 'Sifariş' },
  { value: SalesDeliveryStatus.HAZIR, label: 'Hazır' },
  { value: SalesDeliveryStatus.TEHVIL, label: 'Təhvil' },
  { value: SalesDeliveryStatus.LEGV, label: 'Ləğv' }
];

export function SalesPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [rows, setRows] = useState<SalesEntryItem[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [summary, setSummary] = useState<SalesDashboardSummary | null>(null);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [query, setQuery] = useState<QueryState>({
    page: 1,
    limit: 15,
    search: '',
    sortBy: 'date',
    sortOrder: 'desc',
    customerId: '',
    paymentType: '',
    deliveryStatus: '',
    hasDebt: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<SalesFormState>(initialForm);

  const load = async (nextQuery = query) => {
    setLoading(true);
    setError(null);
    try {
      const [sales, dashboard, customerList] = await Promise.all([
        salesClient.list(nextQuery),
        salesClient.dashboard(),
        customersClient.list({ page: 1, limit: 100, search: '' })
      ]);

      setRows(sales.data);
      setMeta(sales.meta);
      setSummary(dashboard);
      setCustomers(customerList.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Satış məlumatları yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.page, query.limit, query.search, query.customerId, query.paymentType, query.deliveryStatus, query.hasDebt]);

  const updateQuery = (patch: Partial<QueryState>) => {
    setQuery((current) => ({
      ...current,
      ...patch,
      page: patch.page ?? (Object.keys(patch).some((key) => key !== 'page') ? 1 : current.page)
    }));
  };

  const resetForm = () => setForm(initialForm);

  const submit = async () => {
    if (!form.customerId || !form.productName.trim() || form.quantity <= 0) {
      toast.error('Məlumat natamamdır', 'Müştəri, məhsul və say daxil edilməlidir');
      return;
    }

    setSaving(true);
    try {
      await salesClient.create({
        customerId: form.customerId,
        category: form.category,
        productName: form.productName,
        quantity: form.quantity,
        saleAmount: form.saleAmount,
        paymentAmount: form.paymentAmount,
        paymentType: form.paymentType,
        bonus: form.bonus,
        customerBonus: form.customerBonus,
        paperCost: form.paperCost,
        plateCost: form.plateCost,
        printCost: form.printCost,
        laminationCost: form.laminationCost,
        notes: form.notes
      });

      toast.success('Satış əlavə olundu');
      setModalOpen(false);
      resetForm();
      await load(query);
    } catch (e) {
      toast.error('Satış əlavə olunmadı', e instanceof Error ? e.message : 'Xəta baş verdi');
    } finally {
      setSaving(false);
    }
  };

  const customerName = (customer?: CustomerSummary | null) => customer?.name ?? '—';

  if (loading && !summary) {
    return <LoadingState rows={6} />;
  }

  if (error) {
    return <ErrorState description={error} onRetry={() => void load(query)} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Satış"
        description="Əsas satış jurnalı: sifariş, ödəniş, qalıq, qaimə və xərclər bir yerdə."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/orders/new')}>
              Yeni sifariş
            </Button>
            <Button onClick={() => setModalOpen(true)}>Satış əlavə et</Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Satış məbləği" value={formatCurrency(summary?.totalSalesAmount)} icon={BadgeDollarSign} accent="slate" />
        <StatCard label="Ödəniş" value={formatCurrency(summary?.totalPayments)} icon={Wallet} accent="emerald" />
        <StatCard label="Borclar" value={formatCurrency(summary?.totalDebt)} icon={FileClock} accent="amber" />
        <StatCard label="Xeyir" value={formatCurrency(summary?.totalProfit)} icon={PackageCheck} accent="sky" />
        <StatCard label="Orta marja" value={formatPercent(summary?.averageMarginPercent)} subtitle={`${summary?.entries ?? 0} qeyd`} accent="rose" />
      </div>

      <FilterBar>
        <div className="w-full lg:max-w-sm">
          <SearchInput
            value={query.search ?? ''}
            onChange={(value) => updateQuery({ search: value })}
            placeholder="Müştəri, məhsul, kateqoriya və ya qaimə nömrəsi"
          />
        </div>

        <div className="w-full lg:w-56">
          <select
            value={query.customerId}
            onChange={(event) => updateQuery({ customerId: event.target.value })}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
          >
            <option value="">Bütün müştərilər</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full lg:w-44">
          <select
            value={query.paymentType}
            onChange={(event) => updateQuery({ paymentType: event.target.value })}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
          >
            {paymentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full lg:w-44">
          <select
            value={query.deliveryStatus}
            onChange={(event) => updateQuery({ deliveryStatus: event.target.value })}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
          >
            {deliveryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={query.hasDebt} onChange={(event) => updateQuery({ hasDebt: event.target.checked })} />
          Yalnız borclular
        </label>
      </FilterBar>

      <DataTable
        rowKey={(row) => row.id}
        data={rows}
        onRowClick={(row) => row.orderId && navigate(`/orders/${row.orderId}`)}
        columns={[
          { key: 'date', header: 'Tarix', render: (row) => formatDateOnly(row.date) },
          { key: 'customer', header: 'Müştəri', render: (row) => customerName(row.customer) },
          { key: 'manager', header: 'Menecer', render: (row) => row.manager?.fullName ?? '—' },
          { key: 'category', header: 'Kateqoriya', render: (row) => row.category ?? '—' },
          { key: 'product', header: 'Məhsul', render: (row) => row.productName },
          { key: 'quantity', header: 'Say', render: (row) => formatNumber(row.quantity, 0) },
          { key: 'unit', header: 'Satış qiy.', render: (row) => formatCurrency(row.saleUnitPrice) },
          { key: 'sale', header: 'Satış məb.', render: (row) => formatCurrency(row.saleAmount) },
          { key: 'payment', header: 'Ödəniş', render: (row) => formatCurrency(row.paymentAmount) },
          { key: 'paymentType', header: 'Ödəniş növü', render: (row) => row.paymentType },
          { key: 'debt', header: 'Qalıq', render: (row) => formatCurrency(row.remainingDebt) },
          { key: 'finalDebt', header: 'Son qalıq', render: (row) => formatCurrency(row.finalRemainingDebt) },
          { key: 'production', header: 'İstehsal', render: (row) => row.productionStage ?? '—' },
          { key: 'status', header: 'Status', render: (row) => <StatusBadge kind="custom" label={row.deliveryStatus} tone="info" /> },
          { key: 'qaima', header: 'Qaimə', render: (row) => row.qaimaStatus ?? '—' },
          { key: 'paper', header: 'Kağız', render: (row) => formatCurrency(row.paperCost) },
          { key: 'plate', header: 'Forma', render: (row) => formatCurrency(row.plateCost) },
          { key: 'print', header: 'Çap', render: (row) => formatCurrency(row.printCost) },
          { key: 'lamination', header: 'Laminasiya', render: (row) => formatCurrency(row.laminationCost) },
          { key: 'cost', header: 'Ümumi xərc', render: (row) => formatCurrency(row.totalCost) },
          { key: 'profit', header: 'Xeyir', render: (row) => formatCurrency(row.profit) }
        ]}
        emptyState={<EmptyState title="Satış qeydi yoxdur" description="İlk satış qeydi əlavə ediləndən sonra jurnal burada görünəcək." />}
      />

      <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={(page) => updateQuery({ page })} />

      <Modal open={modalOpen} title="Satış əlavə et" description="Excel jurnalına uyğun qısa satış qeydi." onClose={() => setModalOpen(false)}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Müştəri</label>
            <select
              value={form.customerId}
              onChange={(event) => setForm((current) => ({ ...current, customerId: event.target.value }))}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
            >
              <option value="">Müştəri seçin</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Kateqoriya</label>
            <Input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Məhsul</label>
            <Input value={form.productName} onChange={(event) => setForm((current) => ({ ...current, productName: event.target.value }))} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Say</label>
            <Input type="number" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: Number(event.target.value) }))} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Satış məbləği</label>
            <Input type="number" value={form.saleAmount} onChange={(event) => setForm((current) => ({ ...current, saleAmount: Number(event.target.value) }))} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ödəniş</label>
            <Input type="number" value={form.paymentAmount} onChange={(event) => setForm((current) => ({ ...current, paymentAmount: Number(event.target.value) }))} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ödəniş növü</label>
            <select
              value={form.paymentType}
              onChange={(event) => setForm((current) => ({ ...current, paymentType: event.target.value }))}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
            >
              {paymentOptions.filter((item) => item.value).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Bonus</label>
            <Input type="number" value={form.bonus} onChange={(event) => setForm((current) => ({ ...current, bonus: Number(event.target.value) }))} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Bonus müştəri</label>
            <Input type="number" value={form.customerBonus} onChange={(event) => setForm((current) => ({ ...current, customerBonus: Number(event.target.value) }))} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Kağız</label>
            <Input type="number" value={form.paperCost} onChange={(event) => setForm((current) => ({ ...current, paperCost: Number(event.target.value) }))} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Forma</label>
            <Input type="number" value={form.plateCost} onChange={(event) => setForm((current) => ({ ...current, plateCost: Number(event.target.value) }))} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Çap</label>
            <Input type="number" value={form.printCost} onChange={(event) => setForm((current) => ({ ...current, printCost: Number(event.target.value) }))} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Laminasiya</label>
            <Input type="number" value={form.laminationCost} onChange={(event) => setForm((current) => ({ ...current, laminationCost: Number(event.target.value) }))} />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Qeyd</label>
            <textarea
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Bağla
          </Button>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving ? 'Yazılır...' : 'Yadda saxla'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

