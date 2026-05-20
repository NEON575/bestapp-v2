import { useEffect, useMemo, useState } from 'react';
import type { CustomerDebtSummaryItem, SalesEntryQueryDto } from '@bestapp/shared';
import { Button, Input } from '@bestapp/ui';
import { salesClient } from '../shared/api/sales';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../shared/components';
import { formatCurrency, formatDateOnly } from '../shared/lib/format';

export function CustomerDebtsPage() {
  const [rows, setRows] = useState<CustomerDebtSummaryItem[]>([]);
  const [search, setSearch] = useState('');
  const [onlyDebtors, setOnlyDebtors] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const query: SalesEntryQueryDto = {
        search,
        hasDebt: onlyDebtors
      };
      const data = await salesClient.customerDebts(query);
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Müştəri borcları yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [search, onlyDebtors]);

  const totalDebt = useMemo(() => rows.reduce((sum, item) => sum + Number(item.finalRemainingDebt ?? 0), 0), [rows]);

  if (loading) {
    return <LoadingState rows={5} />;
  }

  if (error) {
    return <ErrorState description={error} onRetry={() => void load()} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Müştəri borcu" description="Satış jurnalından avtomatik hesablanan müştəri borcları." />

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full lg:w-80">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Müştəri və ya telefon üzrə axtarış" />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={onlyDebtors} onChange={(event) => setOnlyDebtors(event.target.checked)} />
          Yalnız borclular
        </label>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">Ümumi borc: <span className="font-semibold">{formatCurrency(totalDebt)}</span></div>
      </div>

      {!rows.length ? (
        <EmptyState title="Borclu müştəri yoxdur" description="Aktiv filtrə uyğun nəticə tapılmadı." />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {['Müştəri', 'Telefon', 'Satış məbləği', 'Ödəniş', 'Bonus', 'Bonus Müştəri', 'Qalıq', 'Son qalıq', 'Son satış tarixi'].map((header) => (
                    <th key={header} className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em]">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.customerId} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-950">{row.customerName}</td>
                    <td className="px-4 py-3 text-slate-600">{row.phone ?? '—'}</td>
                    <td className="px-4 py-3">{formatCurrency(row.saleAmount)}</td>
                    <td className="px-4 py-3">{formatCurrency(row.paymentAmount)}</td>
                    <td className="px-4 py-3">{formatCurrency(row.bonus)}</td>
                    <td className="px-4 py-3">{formatCurrency(row.customerBonus)}</td>
                    <td className="px-4 py-3">{formatCurrency(row.remainingDebt)}</td>
                    <td className={`px-4 py-3 font-semibold ${row.finalRemainingDebt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{formatCurrency(row.finalRemainingDebt)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDateOnly(row.lastSaleDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
