import { useEffect, useMemo, useState } from 'react';
import type { CustomerDebtSummaryItem, CustomerListItem } from '@bestapp/shared';
import { Button } from '@bestapp/ui';
import { customersClient } from '../shared/api/customers';
import { salesClient } from '../shared/api/sales';
import {
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  PageHeader,
  SearchInput,
  StatCard
} from '../shared/components';
import { formatCurrency } from '../shared/lib/format';

export function CustomerDebtsPage() {
  const [rows, setRows] = useState<CustomerDebtSummaryItem[]>([]);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [onlyDebtors, setOnlyDebtors] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [debts, customerList] = await Promise.all([
        salesClient.customerDebts(customerId || undefined),
        customersClient.list({ page: 1, limit: 100, search: '' })
      ]);

      setCustomers(customerList.data);
      setRows(onlyDebtors ? debts.filter((item) => item.finalRemainingDebt > 0) : debts);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Müştəri borcu yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [customerId, onlyDebtors]);

  const totalDebt = useMemo(
    () => rows.reduce((sum, row) => sum + row.finalRemainingDebt, 0),
    [rows]
  );

  if (loading) {
    return <LoadingState rows={4} />;
  }

  if (error) {
    return <ErrorState description={error} onRetry={() => void load()} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Müştəri borcu"
        description="Müştəri üzrə satış, ödəniş, bonus və cari qalıq borc."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard label="Borclu müştərilər" value={`${rows.length}`} />
        <StatCard label="Yekun borc" value={formatCurrency(totalDebt)} accent="amber" />
      </div>

      <FilterBar>
        <div className="w-full lg:w-72">
          <select
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
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
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={onlyDebtors} onChange={(event) => setOnlyDebtors(event.target.checked)} />
          Yalnız borclular
        </label>
        <Button variant="secondary" onClick={() => void load()}>
          Yenilə
        </Button>
      </FilterBar>

      <DataTable
        rowKey={(row) => row.customerId}
        data={rows}
        columns={[
          { key: 'customer', header: 'Müştəri', render: (row) => row.customerName },
          { key: 'sale', header: 'Satış', render: (row) => formatCurrency(row.saleAmount) },
          { key: 'payment', header: 'Ödəniş', render: (row) => formatCurrency(row.paymentAmount) },
          { key: 'bonus', header: 'Bonus', render: (row) => formatCurrency(row.bonus) },
          { key: 'customerBonus', header: 'Bonus müştəri', render: (row) => formatCurrency(row.customerBonus) },
          { key: 'debt', header: 'Qalıq', render: (row) => formatCurrency(row.remainingDebt) },
          { key: 'final', header: 'Son qalıq', render: (row) => formatCurrency(row.finalRemainingDebt) }
        ]}
        emptyState={<EmptyState title="Borclu müştəri yoxdur" description="Filtrlərə uyğun borc qeydi tapılmadı." />}
      />
    </div>
  );
}

