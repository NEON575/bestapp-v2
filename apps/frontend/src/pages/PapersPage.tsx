import { useEffect, useState } from 'react';
import type { PaperItem, PaperQueryDto, SupplierItem } from '@bestapp/shared';
import { Button, Input } from '@bestapp/ui';
import { papersClient } from '../shared/api/papers';
import { purchasesClient } from '../shared/api/purchases';
import { EmptyState, ErrorState, LoadingState, PageHeader, Pagination } from '../shared/components';
import { formatCurrency, formatNumber } from '../shared/lib/format';
import { useToast } from '../shared/toast/toast-context';

type PaperDraft = {
  supplierId: string;
  code: string;
  name: string;
  gram: number;
  size: string;
  packPrice: number;
  sheetsInPack: number;
  vatIncluded: boolean;
  notes: string;
};

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createDraft(row: PaperItem): PaperDraft {
  return {
    supplierId: row.supplier?.id ?? '',
    code: row.code,
    name: row.name,
    gram: Number(row.gram ?? 0),
    size: row.size,
    packPrice: Number(row.packPrice ?? 0),
    sheetsInPack: Number(row.sheetsInPack ?? 0),
    vatIncluded: Boolean(row.vatIncluded),
    notes: row.notes ?? ''
  };
}

export function PapersPage() {
  const toast = useToast();
  const [rows, setRows] = useState<PaperItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [query, setQuery] = useState<PaperQueryDto>({ page: 1, limit: 25, search: '', sortBy: 'name', sortOrder: 'asc', supplierId: '', size: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PaperDraft | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickDraft, setQuickDraft] = useState<PaperDraft>({ supplierId: '', code: '', name: '', gram: 0, size: '', packPrice: 0, sheetsInPack: 1, vatIncluded: false, notes: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (nextQuery = query) => {
    setLoading(true);
    setError(null);
    try {
      const [list, supplierList] = await Promise.all([papersClient.list(nextQuery), purchasesClient.listSuppliers()]);
      setRows(list.data);
      setMeta(list.meta);
      setSuppliers(supplierList);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kağız siyahısı yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(query);
  }, [query.page, query.limit, query.search, query.supplierId, query.gram, query.size]);

  const saveRow = async (id: string, source: PaperDraft) => {
    if (!source.code.trim() || !source.name.trim() || source.sheetsInPack <= 0) {
      toast.error('Kod, Ad və Qutuda/List sayı vacibdir');
      return;
    }

    setSaving(true);
    try {
      await papersClient.update(id, {
        supplierId: source.supplierId || undefined,
        code: source.code,
        name: source.name,
        gram: source.gram,
        size: source.size,
        packPrice: source.packPrice,
        sheetsInPack: source.sheetsInPack,
        vatIncluded: source.vatIncluded,
        notes: source.notes || undefined
      });
      toast.success('Kağız qeydi yeniləndi');
      setEditingId(null);
      setDraft(null);
      await load(query);
    } catch (e) {
      toast.error('Kağız qeydi yenilənmədi', e instanceof Error ? e.message : 'Xəta baş verdi');
    } finally {
      setSaving(false);
    }
  };

  const saveQuick = async () => {
    if (!quickDraft.code.trim() || !quickDraft.name.trim() || quickDraft.sheetsInPack <= 0) {
      toast.error('Kod, Ad və Qutuda/List sayı vacibdir');
      return;
    }

    setSaving(true);
    try {
      await papersClient.quickCreate({
        supplierId: quickDraft.supplierId || undefined,
        code: quickDraft.code,
        name: quickDraft.name,
        gram: quickDraft.gram,
        size: quickDraft.size,
        packPrice: quickDraft.packPrice,
        sheetsInPack: quickDraft.sheetsInPack,
        vatIncluded: quickDraft.vatIncluded,
        notes: quickDraft.notes || undefined
      });
      toast.success('Kağız qeydi yaradıldı');
      setQuickOpen(false);
      await load(query);
    } catch (e) {
      toast.error('Kağız qeydi yaradılmadı', e instanceof Error ? e.message : 'Xəta baş verdi');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !rows.length) {
    return <LoadingState rows={5} />;
  }

  if (error) {
    return <ErrorState description={error} onRetry={() => void load(query)} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Kağız" description="Kağız kataloqu: qramaj, ölçü, qiymət və 1 list maya dəyəri." actions={<Button onClick={() => setQuickOpen(true)}>Yeni kağız sətri</Button>} />

      <div className="flex flex-wrap gap-3">
        <div className="w-full lg:w-64">
          <Input value={query.search ?? ''} onChange={(event) => setQuery((current) => ({ ...current, search: event.target.value, page: 1 }))} placeholder="Kod, ad və ya ölçü" />
        </div>
        <div className="w-full lg:w-44">
          <Input type="number" value={query.gram ?? ''} onChange={(event) => setQuery((current) => ({ ...current, gram: event.target.value ? toNumber(event.target.value) : undefined, page: 1 }))} placeholder="Qram" />
        </div>
        <div className="w-full lg:w-44">
          <Input value={query.size ?? ''} onChange={(event) => setQuery((current) => ({ ...current, size: event.target.value, page: 1 }))} placeholder="Razmer" />
        </div>
        <div className="w-full lg:w-56">
          <select value={query.supplierId ?? ''} onChange={(event) => setQuery((current) => ({ ...current, supplierId: event.target.value, page: 1 }))} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">
            <option value="">Bütün təchizatçılar</option>
            {suppliers.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </div>
      </div>

      {!rows.length && !quickOpen ? (
        <EmptyState title="Kağız qeydi yoxdur" description="Yeni kağız sətri əlavə edildikdən sonra burada görünəcək." />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {['Kod', 'Ad', 'Qram', 'Razmer', 'Qiymət', 'ƏDV', 'Təchizatçı', 'Qutuda/List sayı', '1 list qiyməti', 'Qeyd', 'Əməliyyat'].map((header) => (
                    <th key={header} className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em]">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {quickOpen ? (
                  <PaperEditRow draft={quickDraft} suppliers={suppliers} saving={saving} onChange={setQuickDraft} onCancel={() => setQuickOpen(false)} onSave={() => void saveQuick()} />
                ) : null}
                {rows.map((row) =>
                  editingId === row.id && draft ? (
                    <PaperEditRow key={row.id} draft={draft} suppliers={suppliers} saving={saving} onChange={setDraft} onCancel={() => { setEditingId(null); setDraft(null); }} onSave={() => void saveRow(row.id, draft)} />
                  ) : (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-950">{row.code}</td>
                      <td className="px-4 py-3">{row.name}</td>
                      <td className="px-4 py-3">{formatNumber(row.gram, 0)}</td>
                      <td className="px-4 py-3">{row.size}</td>
                      <td className="px-4 py-3">{formatCurrency(row.packPrice)}</td>
                      <td className="px-4 py-3">{row.vatIncluded ? 'Bəli' : 'Xeyr'}</td>
                      <td className="px-4 py-3">{row.supplier?.name ?? '—'}</td>
                      <td className="px-4 py-3">{row.sheetsInPack}</td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(row.pricePerSheet)}</td>
                      <td className="px-4 py-3">{row.notes ?? '—'}</td>
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

function PaperEditRow({
  draft,
  suppliers,
  saving,
  onChange,
  onCancel,
  onSave
}: {
  draft: PaperDraft;
  suppliers: SupplierItem[];
  saving: boolean;
  onChange: (draft: PaperDraft) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const pricePerSheet = draft.sheetsInPack > 0 ? draft.packPrice / draft.sheetsInPack : 0;

  return (
    <tr className="bg-amber-50/60">
      <td className="px-4 py-2"><Input className="h-9 rounded-lg px-2" value={draft.code} onChange={(event) => onChange({ ...draft, code: event.target.value })} /></td>
      <td className="px-4 py-2"><Input className="h-9 rounded-lg px-2" value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} /></td>
      <td className="px-4 py-2"><Input className="h-9 rounded-lg px-2" type="number" value={draft.gram} onChange={(event) => onChange({ ...draft, gram: toNumber(event.target.value) })} /></td>
      <td className="px-4 py-2"><Input className="h-9 rounded-lg px-2" value={draft.size} onChange={(event) => onChange({ ...draft, size: event.target.value })} /></td>
      <td className="px-4 py-2"><Input className="h-9 rounded-lg px-2" type="number" value={draft.packPrice} onChange={(event) => onChange({ ...draft, packPrice: toNumber(event.target.value) })} /></td>
      <td className="px-4 py-2">
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={draft.vatIncluded} onChange={(event) => onChange({ ...draft, vatIncluded: event.target.checked })} /> ƏDV</label>
      </td>
      <td className="px-4 py-2">
        <select className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2" value={draft.supplierId} onChange={(event) => onChange({ ...draft, supplierId: event.target.value })}>
          <option value="">Təchizatçı</option>
          {suppliers.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2"><Input className="h-9 rounded-lg px-2" type="number" value={draft.sheetsInPack} onChange={(event) => onChange({ ...draft, sheetsInPack: toNumber(event.target.value) })} /></td>
      <td className="px-4 py-2 font-semibold">{formatCurrency(pricePerSheet)}</td>
      <td className="px-4 py-2"><Input className="h-9 rounded-lg px-2" value={draft.notes} onChange={(event) => onChange({ ...draft, notes: event.target.value })} /></td>
      <td className="px-4 py-2">
        <div className="flex gap-2">
          <Button className="h-8 rounded-lg px-3 text-xs" onClick={onSave} disabled={saving}>{saving ? '...' : 'Yadda saxla'}</Button>
          <Button className="h-8 rounded-lg px-3 text-xs" variant="secondary" onClick={onCancel}>Bağla</Button>
        </div>
      </td>
    </tr>
  );
}
