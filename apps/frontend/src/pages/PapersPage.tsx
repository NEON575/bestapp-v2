import { useEffect, useState } from 'react';
import type { PaperItem, SupplierItem } from '@bestapp/shared';
import { Button, Input } from '@bestapp/ui';
import { papersClient } from '../shared/api/papers';
import { purchasesClient } from '../shared/api/purchases';
import {
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  Modal,
  PageHeader,
  SearchInput
} from '../shared/components';
import { formatCurrency, formatNumber } from '../shared/lib/format';
import { useToast } from '../shared/toast/toast-context';

type PaperForm = {
  supplierId: string;
  code: string;
  name: string;
  gram: number;
  size: string;
  packPrice: number;
  sheetsInPack: number;
  vatIncluded: boolean;
  unit: string;
  notes: string;
};

const initialForm: PaperForm = {
  supplierId: '',
  code: '',
  name: '',
  gram: 0,
  size: '',
  packPrice: 0,
  sheetsInPack: 1,
  vatIncluded: false,
  unit: 'sheet',
  notes: ''
};

export function PapersPage() {
  const toast = useToast();
  const [rows, setRows] = useState<PaperItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PaperForm>(initialForm);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [papers, supplierList] = await Promise.all([
        papersClient.list({ page: 1, limit: 200, search }),
        purchasesClient.listSuppliers()
      ]);
      setRows(papers.data);
      setSuppliers(supplierList);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kağız məlumatları yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [search]);

  const submit = async () => {
    if (!form.code.trim() || !form.name.trim() || !form.size.trim()) {
      toast.error('Kod, ad və ölçü vacibdir');
      return;
    }

    setSaving(true);
    try {
      await papersClient.create({
        supplierId: form.supplierId || undefined,
        code: form.code,
        name: form.name,
        gram: form.gram,
        size: form.size,
        packPrice: form.packPrice,
        sheetsInPack: form.sheetsInPack,
        vatIncluded: form.vatIncluded,
        unit: form.unit,
        notes: form.notes || undefined
      });
      toast.success('Kağız əlavə olundu');
      setModalOpen(false);
      setForm(initialForm);
      await load();
    } catch (e) {
      toast.error('Kağız əlavə olunmadı', e instanceof Error ? e.message : 'Xəta baş verdi');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState rows={4} />;
  }

  if (error) {
    return <ErrorState description={error} onRetry={() => void load()} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kağız"
        description="Kağız kataloqu: kod, qramaj, ölçü, pack qiyməti, ƏDV və vərəq maya dəyəri."
        actions={<Button onClick={() => setModalOpen(true)}>Kağız əlavə et</Button>}
      />

      <FilterBar>
        <div className="w-full lg:max-w-sm">
          <SearchInput value={search} onChange={setSearch} placeholder="Kod, ad, ölçü və təchizatçı üzrə axtarış" />
        </div>
      </FilterBar>

      <DataTable
        rowKey={(row) => row.id}
        data={rows}
        columns={[
          { key: 'code', header: 'Kod', render: (row) => row.code },
          { key: 'name', header: 'Ad', render: (row) => row.name },
          { key: 'gram', header: 'Qram', render: (row) => `${formatNumber(row.gram, 0)} gsm` },
          { key: 'size', header: 'Ölçü', render: (row) => row.size },
          { key: 'supplier', header: 'Təchizatçı', render: (row) => row.supplier?.name ?? '—' },
          { key: 'packPrice', header: 'Pack qiyməti', render: (row) => formatCurrency(row.packPrice) },
          { key: 'sheets', header: 'Pack/vərəq', render: (row) => `${row.sheetsInPack}` },
          { key: 'sheetPrice', header: 'Vərəq maya dəyəri', render: (row) => formatCurrency(row.pricePerSheet) },
          { key: 'vat', header: 'ƏDV', render: (row) => (row.vatIncluded ? 'Bəli' : 'Xeyr') }
        ]}
        emptyState={<EmptyState title="Kağız qeydi yoxdur" description="İlk kağız qeydi əlavə olunandan sonra siyahı burada görünəcək." />}
      />

      <Modal open={modalOpen} title="Kağız əlavə et" onClose={() => setModalOpen(false)} widthClassName="max-w-2xl">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Kod</label>
            <Input value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ad</label>
            <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Qram</label>
            <Input type="number" value={form.gram} onChange={(event) => setForm((current) => ({ ...current, gram: Number(event.target.value) }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ölçü</label>
            <Input value={form.size} onChange={(event) => setForm((current) => ({ ...current, size: event.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Pack qiyməti</label>
            <Input type="number" value={form.packPrice} onChange={(event) => setForm((current) => ({ ...current, packPrice: Number(event.target.value) }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Pack-də vərəq sayı</label>
            <Input type="number" value={form.sheetsInPack} onChange={(event) => setForm((current) => ({ ...current, sheetsInPack: Number(event.target.value) }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Təchizatçı</label>
            <select
              value={form.supplierId}
              onChange={(event) => setForm((current) => ({ ...current, supplierId: event.target.value }))}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
            >
              <option value="">Seçin</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Vahid</label>
            <Input value={form.unit} onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))} />
          </div>
          <label className="md:col-span-2 flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.vatIncluded} onChange={(event) => setForm((current) => ({ ...current, vatIncluded: event.target.checked }))} />
            ƏDV daxildir
          </label>
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

