import { useEffect, useState } from 'react';
import type { EmployeeItem, SalaryEntryItem, SalaryEntryQueryDto, SalaryTotalsSummary } from '@bestapp/shared';
import { Button, Input } from '@bestapp/ui';
import { salariesClient } from '../shared/api/salaries';
import { EmptyState, ErrorState, LoadingState, PageHeader, Pagination } from '../shared/components';
import { formatCurrency, formatDateOnly } from '../shared/lib/format';
import { useToast } from '../shared/toast/toast-context';

type SalaryDraft = {
  employeeId: string;
  date: string;
  salaryAmount: number;
  bonusAmount: number;
  paymentAmount: number;
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

function createDraft(row: SalaryEntryItem): SalaryDraft {
  return {
    employeeId: row.employee?.id ?? '',
    date: toInputDate(row.date),
    salaryAmount: Number(row.salaryAmount ?? 0),
    bonusAmount: Number(row.bonusAmount ?? 0),
    paymentAmount: Number(row.paymentAmount ?? 0),
    comment: row.comment ?? ''
  };
}

export function SalariesPage() {
  const toast = useToast();
  const [rows, setRows] = useState<SalaryEntryItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [summary, setSummary] = useState<SalaryTotalsSummary | null>(null);
  const [meta, setMeta] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [query, setQuery] = useState<SalaryEntryQueryDto>({ page: 1, limit: 25, search: '', sortBy: 'date', sortOrder: 'desc' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SalaryDraft | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickDraft, setQuickDraft] = useState<SalaryDraft>({ employeeId: '', date: toInputDate(new Date().toISOString()), salaryAmount: 0, bonusAmount: 0, paymentAmount: 0, comment: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (nextQuery = query) => {
    setLoading(true);
    setError(null);
    try {
      const [list, totals, employeeList] = await Promise.all([
        salariesClient.list(nextQuery),
        salariesClient.summary(nextQuery),
        salariesClient.listEmployees()
      ]);
      setRows(list.data);
      setMeta(list.meta);
      setSummary(totals);
      setEmployees(employeeList);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Maaş məlumatı yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(query);
  }, [query.page, query.limit, query.search, query.employeeId, query.dateFrom, query.dateTo]);

  const saveRow = async (id: string, source: SalaryDraft) => {
    if (!source.employeeId || source.salaryAmount <= 0) {
      toast.error('Ad və Maaş sahələri vacibdir');
      return;
    }

    setSaving(true);
    try {
      await salariesClient.update(id, {
        employeeId: source.employeeId,
        date: source.date || undefined,
        salaryAmount: source.salaryAmount,
        bonusAmount: source.bonusAmount,
        paymentAmount: source.paymentAmount,
        comment: source.comment || undefined
      });
      toast.success('Maaş sətri yeniləndi');
      setEditingId(null);
      setDraft(null);
      await load(query);
    } catch (e) {
      toast.error('Maaş sətri yenilənmədi', e instanceof Error ? e.message : 'Xəta baş verdi');
    } finally {
      setSaving(false);
    }
  };

  const saveQuick = async () => {
    if (!quickDraft.employeeId || quickDraft.salaryAmount <= 0) {
      toast.error('Ad və Maaş sahələri vacibdir');
      return;
    }

    setSaving(true);
    try {
      await salariesClient.quickCreate({
        employeeId: quickDraft.employeeId,
        date: quickDraft.date || undefined,
        salaryAmount: quickDraft.salaryAmount,
        bonusAmount: quickDraft.bonusAmount,
        paymentAmount: quickDraft.paymentAmount,
        comment: quickDraft.comment || undefined
      });
      toast.success('Maaş sətri yaradıldı');
      setQuickOpen(false);
      await load(query);
    } catch (e) {
      toast.error('Yeni maaş sətri yaradılmadı', e instanceof Error ? e.message : 'Xəta baş verdi');
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
      <PageHeader title="Maaş" description="Maaş, bonus, ödəniş və qalıq izlənməsi." actions={<Button onClick={() => setQuickOpen(true)}>Yeni maaş sətri</Button>} />

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryBox label="Maaş cəmi" value={formatCurrency(summary?.totalSalaryAmount)} />
        <SummaryBox label="Bonus cəmi" value={formatCurrency(summary?.totalBonusAmount)} />
        <SummaryBox label="Ödəniş cəmi" value={formatCurrency(summary?.totalPaymentAmount)} />
        <SummaryBox label="Ümumi qalıq" value={formatCurrency(summary?.totalRemainingDebt)} />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="w-full lg:w-64">
          <Input value={query.search ?? ''} onChange={(event) => setQuery((current) => ({ ...current, search: event.target.value, page: 1 }))} placeholder="İşçi üzrə axtarış" />
        </div>
        <div className="w-full lg:w-56">
          <select value={query.employeeId ?? ''} onChange={(event) => setQuery((current) => ({ ...current, employeeId: event.target.value, page: 1 }))} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">
            <option value="">Bütün işçilər</option>
            {employees.map((item) => (
              <option key={item.id} value={item.id}>{item.fullName}</option>
            ))}
          </select>
        </div>
      </div>

      {!rows.length && !quickOpen ? (
        <EmptyState title="Maaş sətri yoxdur" description="Yeni maaş sətri əlavə edildikdən sonra burada görünəcək." />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {['Tarix', 'Ad', 'Maaş', 'Bonus', 'Ödəniş', 'Qalıq', 'Qeyd', 'Əməliyyat'].map((header) => (
                    <th key={header} className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em]">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {quickOpen ? (
                  <SalaryEditRow draft={quickDraft} employees={employees} saving={saving} onChange={setQuickDraft} onCancel={() => setQuickOpen(false)} onSave={() => void saveQuick()} />
                ) : null}
                {rows.map((row) =>
                  editingId === row.id && draft ? (
                    <SalaryEditRow key={row.id} draft={draft} employees={employees} saving={saving} onChange={setDraft} onCancel={() => { setEditingId(null); setDraft(null); }} onSave={() => void saveRow(row.id, draft)} />
                  ) : (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="px-4 py-3">{formatDateOnly(row.date)}</td>
                      <td className="px-4 py-3 font-medium text-slate-950">{row.employee?.fullName ?? '—'}</td>
                      <td className="px-4 py-3">{formatCurrency(row.salaryAmount)}</td>
                      <td className="px-4 py-3">{formatCurrency(row.bonusAmount)}</td>
                      <td className="px-4 py-3">{formatCurrency(row.paymentAmount)}</td>
                      <td className={`px-4 py-3 font-semibold ${row.remainingDebt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{formatCurrency(row.remainingDebt)}</td>
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

function SalaryEditRow({
  draft,
  employees,
  saving,
  onChange,
  onCancel,
  onSave
}: {
  draft: SalaryDraft;
  employees: EmployeeItem[];
  saving: boolean;
  onChange: (draft: SalaryDraft) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const remainingDebt = draft.salaryAmount + draft.bonusAmount - draft.paymentAmount;

  return (
    <tr className="bg-amber-50/60">
      <td className="px-4 py-2"><Input className="h-9 rounded-lg px-2" type="date" value={draft.date} onChange={(event) => onChange({ ...draft, date: event.target.value })} /></td>
      <td className="px-4 py-2">
        <select className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2" value={draft.employeeId} onChange={(event) => onChange({ ...draft, employeeId: event.target.value })}>
          <option value="">İşçi</option>
          {employees.map((item) => (
            <option key={item.id} value={item.id}>{item.fullName}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2"><Input className="h-9 rounded-lg px-2" type="number" value={draft.salaryAmount} onChange={(event) => onChange({ ...draft, salaryAmount: toNumber(event.target.value) })} /></td>
      <td className="px-4 py-2"><Input className="h-9 rounded-lg px-2" type="number" value={draft.bonusAmount} onChange={(event) => onChange({ ...draft, bonusAmount: toNumber(event.target.value) })} /></td>
      <td className="px-4 py-2"><Input className="h-9 rounded-lg px-2" type="number" value={draft.paymentAmount} onChange={(event) => onChange({ ...draft, paymentAmount: toNumber(event.target.value) })} /></td>
      <td className="px-4 py-2 font-semibold">{formatCurrency(remainingDebt)}</td>
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

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-950">{value}</div>
    </div>
  );
}
