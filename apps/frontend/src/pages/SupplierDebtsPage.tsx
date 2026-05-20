import { useEffect, useMemo, useState } from 'react';
import type { SupplierDebtSummaryItem, SupplierItem } from '@bestapp/shared';
import { Button } from '@bestapp/ui';
import { purchasesClient } from '../shared/api/purchases';
import {
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  PageHeader,
  StatCard
} from '../shared/components';
import { formatCurrency } from '../shared/lib/format';

export function SupplierDebtsPage() {
  const [rows, setRows] = useState<SupplierDebtSummaryItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [debts, supplierList] = await Promise.all([
        purchasesClient.supplierDebts(supplierId || undefined),
        purchasesClient.listSuppliers()
      ]);
      setRows(debts.filter((item) => item.remainingDebt > 0));
      setSuppliers(supplierList);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Təchizatçı borcu yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [supplierId]);

  const totalDebt = useMemo(() => rows.reduce((sum, row) => sum + row.remainingDebt, 0), [rows]);

  if (loading) {
    return <LoadingState rows={4} />;
  }

  if (error) {
    return <ErrorState description={error} onRetry={() => void load()} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Təchizatçı borcu"
        description="Təchizatçı üzrə alış məbləği, ödəniş və qalıq borc."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard label="Borclu təchizatçılar" value={`${rows.length}`} />
        <StatCard label="Yekun borc" value={formatCurrency(totalDebt)} accent="amber" />
      </div>

      <FilterBar>
        <div className="w-full lg:w-72">
          <select
            value={supplierId}
            onChange={(event) => setSupplierId(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
          >
            <option value="">Bütün təchizatçılar</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>
        <Button variant="secondary" onClick={() => void load()}>
          Yenilə
        </Button>
      </FilterBar>

      <DataTable
        rowKey={(row) => row.supplierId}
        data={rows}
        columns={[
          { key: 'supplier', header: 'Təchizatçı', render: (row) => row.supplierName },
          { key: 'purchase', header: 'Alış', render: (row) => formatCurrency(row.purchaseAmount) },
          { key: 'payment', header: 'Ödəniş', render: (row) => formatCurrency(row.paymentAmount) },
          { key: 'debt', header: 'Qalıq borc', render: (row) => formatCurrency(row.remainingDebt) }
        ]}
        emptyState={<EmptyState title="Qalıq borc yoxdur" description="Hazırda təchizatçılar üzrə açıq borc görünmür." />}
      />
    </div>
  );
}

