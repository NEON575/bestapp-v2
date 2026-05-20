import { useEffect, useMemo, useState } from 'react';
import type { PurchaseEntryItem, PurchaseEntryQueryDto, PurchaseSummary, SupplierItem } from '@bestapp/shared';
import { SalesPaymentType } from '@bestapp/shared';
import { Button, Input } from '@bestapp/ui';
import { purchasesClient } from '../shared/api/purchases';
import { EmptyState, ErrorState, LoadingState, PageHeader, Pagination } from '../shared/components';
import { formatCurrency, formatDateOnly } from '../shared/lib/format';
import { getSalesLabel, salesPaymentTypeLabels } from '../shared/lib/salesLabels';
import { useToast } from '../shared/toast/toast-context';

type PurchaseDraft = {
  supplierId: string;
  date: string;
  amount: number;
  paymentAmount: number;
  paymentType: string;
  comment: string;
};

function toInputDate(value?: string | null) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createDraft(row: PurchaseEntryItem): PurchaseDraft {
  return {
    supplierId: row.supplier?.id ?? '',
    date: toInputDate(row.date),
    amount: Number(row.amount ?? 0),
    paymentAmount: Number(row.paymentAmount ?? 0),
    paymentType: row.paymentType ?? SalesPaymentType.HESAB,
    comment: row.comment ?? ''
  };
}

export function PurchasesPage() {
  const toast = useToast();
  const [rows, setRows] = useState<PurchaseEntryItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [summary, setSummary] = useState<PurchaseSummary | null>(null);
  const [meta, setMeta] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [query, setQuery] = useState<PurchaseEntryQueryDto>({ page: 1, limit: 25, search: '', sortBy: 'date', sortOrder: 'desc' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PurchaseDraft | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickDraft, setQuickDraft] = useState<PurchaseDraft>({ supplierId: '', date: toInputDate(new Date().toISOString()), amount: 0, paymentAmount: 0, paymentType: SalesPaymentType.HESAB, comment: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (nextQuery = query) => {
    setLoading(true);
    setError(null);
    try {
      const [list, totals, supplierList] = await Promise.all([
        purchasesClient.list(nextQuery),
        purchasesClient.summary(nextQuery),
        purchasesClient.listSuppliers()
      ]);
      setRows(list.data);
      setMeta(list.meta);
      setSummary(totals);
      setSuppliers(supplierList);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Alış məlumatı yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(query);
  }, [query.page, query.limit, query.search, query.supplierId, query.paymentType, query.onlyDebtors, query.dateFrom, query.dateTo]);

  const totalDebt = useMemo(() => formatCurrency(summary?.totalSupplierDebt), [summary]);

  const saveRow = async (id: string, source: PurchaseDraft) => {
    if (!source.supplierId || source.amount <= 0) {
      toast.error('Təchizatçı və alış məbləği vacibdir');
      return;
    }

    setSaving(true);
    try {
      await purchasesClient.update(id, {
        supplierId: source.supplierId,
        date: source.date || undefined,
        amount: source.amount,
        paymentAmount: source.paymentAmount,
        paymentType: source.paymentType,
        comment: source.comment || undefined
      });
      toast.success('Alış sətri yeniləndi');
      setEditingId(null);
      setDraft(null);
      await load(query);
    } catch (e) {
      toast.error('Alış sətri yenilənmədi', e instanceof Error ? e.message : 'Xəta baş verdi');
    } finally {
      setSaving(false);
    }
  };

  const saveQuick = async () => {
    if (!quickDraft.supplierId || quickDraft.amount <= 0) {
      toast.error('Təchizatçı və alış məbləği vacibdir');
      return;
    }

    setSaving(true);
    try {
      await purchasesClient.quickCreate({
        supplierId: quickDraft.supplierId,
        date: quickDraft.date || undefined,
        amount: quickDraft.amount,
        paymentAmount: quickDraft.paymentAmount,
        paymentType: quickDraft.paymentType,
        comment: quickDraft.comment || undefined
      });
      toast.success('Alış sətri yaradıldı');
      setQuickOpen(false);
      setQuickDraft({ supplierId: '', date: toInputDate(new Date().toISOString()), amount: 0, paymentAmount: 0, paymentType: SalesPaymentType.HESAB, comment: '' });
      await load(query);
    } catch (e) {
      toast.error('Yeni alış sətri yaradılmadı', e instanceof Error ? e.message : 'Xəta baş verdi');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !summary) {
    return <LoadingState rows={5} />;
  }

  if (error) {
    return <ErrorState description={error} onRetry={() => void load(query)} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Alış"
        description="Təchizatçı alışları, ödənişlər və qalıq borclar bir cədvəldə."
        actions={<Button onClick={() => setQuickOpen(true)}>Yeni alış sətri</Button>}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <SummaryBox label="Alış cəmi" value={formatCurrency(summary?.totalPurchaseAmount)} />
        <SummaryBox label="Ödəniş cəmi" value={formatCurrency(summary?.totalPaymentAmount)} />
        <SummaryBox label="Qalıq borc cəmi" value={totalDebt} />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="w-full lg:w-64">
          <Input value={query.search ?? ''} onChange={(event) => setQuery((current) => ({ ...current, search: event.target.value, page: 1 }))} placeholder="Axtarış" />
        </div>
        <Select value={query.supplierId ?? ''} onChange={(value) => setQuery((current) => ({ ...current, supplierId: value, page: 1 }))} placeholder="Təchizatçı" options={suppliers.map((item) => ({ value: item.id, label: item.name }))} />
        <Select value={query.paymentType ?? ''} onChange={(value) => setQuery((current) => ({ ...current, paymentType: value, page: 1 }))} placeholder="Ödəniş növü" options={Object.entries(salesPaymentTypeLabels).map(([value, label]) => ({ value, label }))} />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={Boolean(query.onlyDebtors)} onChange={(event) => setQuery((current) => ({ ...current, onlyDebtors: event.target.checked, page: 1 }))} />
          Yalnız borclular
        </label>
      </div>

      {!rows.length && !quickOpen ? (
        <EmptyState title="Alış sətri yoxdur" description="Yeni alış əlavə etdikdən sonra cədvəl burada görünəcək." />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {['Tarix', 'Təchizatçı', 'Alış məbləği', 'Ödəniş', 'Qalıq borc', 'Ödəniş növü', 'Qeyd', 'Əməliyyat'].map((header) => (
                    <th key={header} className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em]">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {quickOpen ? (
                  <PurchaseEditRow draft={quickDraft} suppliers={suppliers} saving={saving} onChange={setQuickDraft} onCancel={() => setQuickOpen(false)} onSave={() => void saveQuick()} />
                ) : null}
                {rows.map((row) =>
                  editingId === row.id && draft ? (
                    <PurchaseEditRow key={row.id} draft={draft} suppliers={suppliers} saving={saving} onChange={setDraft} onCancel={() => { setEditingId(null); setDraft(null); }} onSave={() => void saveRow(row.id, draft)} />
                  ) : (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="px-4 py-3">{formatDateOnly(row.date)}</td>
                      <td className="px-4 py-3 font-medium text-slate-950">{row.supplier?.name ?? '—'}</td>
                      <td className="px-4 py-3">{formatCurrency(row.amount)}</td>
                      <td className="px-4 py-3">{formatCurrency(row.paymentAmount)}</td>
                      <td className={`px-4 py-3 font-semibold ${row.remainingDebt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{formatCurrency(row.remainingDebt)}</td>
                      <td className="px-4 py-3">{getSalesLabel(salesPaymentTypeLabels, row.paymentType)}</td>
                      <td className="px-4 py-3">{row.comment ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Button className="h-8 rounded-lg px-3 text-xs" variant="secondary" onClick={() => { setEditingId(row.id); setDraft(createDraft(row)); }}>
                          Düzəliş
                        </Button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={(page) => setQuery((current) => ({ ...current, page }))} />
    </div>
  );
}

function PurchaseEditRow({
  draft,
  suppliers,
  saving,
  onChange,
  onCancel,
  onSave
}: {
  draft: PurchaseDraft;
  suppliers: SupplierItem[];
  saving: boolean;
  onChange: (draft: PurchaseDraft) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const remainingDebt = draft.amount - draft.paymentAmount;

  return (
    <tr className="bg-amber-50/60">
      <td className="px-4 py-2"><Input className="h-9 rounded-lg px-2" type="date" value={draft.date} onChange={(event) => onChange({ ...draft, date: event.target.value })} /></td>
      <td className="px-4 py-2">
        <select className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2" value={draft.supplierId} onChange={(event) => onChange({ ...draft, supplierId: event.target.value })}>
          <option value="">Təchizatçı</option>
          {suppliers.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2"><Input className="h-9 rounded-lg px-2" type="number" value={draft.amount} onChange={(event) => onChange({ ...draft, amount: toNumber(event.target.value) })} /></td>
      <td className="px-4 py-2"><Input className="h-9 rounded-lg px-2" type="number" value={draft.paymentAmount} onChange={(event) => onChange({ ...draft, paymentAmount: toNumber(event.target.value) })} /></td>
      <td className="px-4 py-2 font-semibold">{formatCurrency(remainingDebt)}</td>
      <td className="px-4 py-2">
        <select className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2" value={draft.paymentType} onChange={(event) => onChange({ ...draft, paymentType: event.target.value })}>
          {Object.entries(salesPaymentTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2"><Input className="h-9 rounded-lg px-2" value={draft.comment} onChange={(event) => onChange({ ...draft, comment: event.target.value })} /></td>
      <td className="px-4 py-2">
        <div className="flex gap-2">
          <Button className="h-8 rounded-lg px-3 text-xs" onClick={onSave} disabled={saving}>{saving ? '...' : 'Yadda saxla'}</Button>
          <Button className="h-8 rounded-lg px-3 text-xs" variant="secondary" onClick={onCancel}>Bağla</Button>
        </div>
      </td>
    </tr>
  );
}

function Select({
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
    <div className="w-full lg:w-52">
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-950">{value}</div>
    </div>
  );
}
