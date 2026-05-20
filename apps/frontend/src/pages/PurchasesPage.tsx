import { useEffect, useState } from 'react';
import type { PurchaseEntryItem, PurchaseSummary, SupplierItem } from '@bestapp/shared';
import { SalesPaymentType } from '@bestapp/shared';
import { Button, Input } from '@bestapp/ui';
import { purchasesClient } from '../shared/api/purchases';
import {
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  Modal,
  PageHeader,
  SearchInput,
  StatCard
} from '../shared/components';
import { formatCurrency, formatDateOnly } from '../shared/lib/format';
import { useToast } from '../shared/toast/toast-context';

type PurchaseForm = {
  supplierId: string;
  amount: number;
  paymentAmount: number;
  paymentType: string;
  comment: string;
};

type SupplierForm = {
  code: string;
  name: string;
  phone: string;
};

const initialPurchaseForm: PurchaseForm = {
  supplierId: '',
  amount: 0,
  paymentAmount: 0,
  paymentType: SalesPaymentType.HESAB,
  comment: ''
};

const initialSupplierForm: SupplierForm = {
  code: '',
  name: '',
  phone: ''
};

export function PurchasesPage() {
  const toast = useToast();
  const [rows, setRows] = useState<PurchaseEntryItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [summary, setSummary] = useState<PurchaseSummary | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState<PurchaseForm>(initialPurchaseForm);
  const [supplierForm, setSupplierForm] = useState<SupplierForm>(initialSupplierForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [purchases, supplierList, totals] = await Promise.all([
        purchasesClient.list({ page: 1, limit: 200, search }),
        purchasesClient.listSuppliers(),
        purchasesClient.summary()
      ]);

      setRows(purchases.data);
      setSuppliers(supplierList);
      setSummary(totals);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Alış məlumatları yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [search]);

  const submitSupplier = async () => {
    if (!supplierForm.name.trim()) {
      toast.error('Təchizatçı adı vacibdir');
      return;
    }

    setSaving(true);
    try {
      await purchasesClient.createSupplier({
        code: supplierForm.code || undefined,
        name: supplierForm.name,
        phone: supplierForm.phone || undefined
      });
      toast.success('Təchizatçı əlavə olundu');
      setSupplierModalOpen(false);
      setSupplierForm(initialSupplierForm);
      await load();
    } catch (e) {
      toast.error('Təchizatçı əlavə olunmadı', e instanceof Error ? e.message : 'Xəta baş verdi');
    } finally {
      setSaving(false);
    }
  };

  const submitPurchase = async () => {
    if (!purchaseForm.supplierId || purchaseForm.amount <= 0) {
      toast.error('Təchizatçı və alış məbləği vacibdir');
      return;
    }

    setSaving(true);
    try {
      await purchasesClient.create({
        supplierId: purchaseForm.supplierId,
        amount: purchaseForm.amount,
        paymentAmount: purchaseForm.paymentAmount,
        paymentType: purchaseForm.paymentType,
        comment: purchaseForm.comment
      });
      toast.success('Alış əlavə olundu');
      setPurchaseModalOpen(false);
      setPurchaseForm(initialPurchaseForm);
      await load();
    } catch (e) {
      toast.error('Alış əlavə olunmadı', e instanceof Error ? e.message : 'Xəta baş verdi');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !summary) {
    return <LoadingState rows={5} />;
  }

  if (error) {
    return <ErrorState description={error} onRetry={() => void load()} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Alış"
        description="Təchizatçılar üzrə alışlar, ödənişlər və qalıq borclar."
        actions={
          <>
            <Button variant="secondary" onClick={() => setSupplierModalOpen(true)}>
              Təchizatçı əlavə et
            </Button>
            <Button onClick={() => setPurchaseModalOpen(true)}>Alış əlavə et</Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Alış məbləği" value={formatCurrency(summary?.totalPurchaseAmount)} />
        <StatCard label="Ödənilib" value={formatCurrency(summary?.totalPaymentAmount)} accent="emerald" />
        <StatCard label="Təchizatçı borcu" value={formatCurrency(summary?.totalSupplierDebt)} accent="amber" />
      </div>

      <FilterBar>
        <div className="w-full lg:max-w-sm">
          <SearchInput value={search} onChange={setSearch} placeholder="Təchizatçı və ya qeyd üzrə axtarış" />
        </div>
      </FilterBar>

      <DataTable
        rowKey={(row) => row.id}
        data={rows}
        columns={[
          { key: 'date', header: 'Tarix', render: (row) => formatDateOnly(row.date) },
          { key: 'supplier', header: 'Təchizatçı', render: (row) => row.supplier?.name ?? '—' },
          { key: 'amount', header: 'Alış məbləği', render: (row) => formatCurrency(row.amount) },
          { key: 'payment', header: 'Ödəniş', render: (row) => formatCurrency(row.paymentAmount) },
          { key: 'debt', header: 'Qalıq borc', render: (row) => formatCurrency(row.remainingDebt) },
          { key: 'type', header: 'Ödəniş növü', render: (row) => row.paymentType },
          { key: 'comment', header: 'Qeyd', render: (row) => row.comment ?? '—' }
        ]}
        emptyState={<EmptyState title="Alış qeydi yoxdur" description="İlk alış qeydi əlavə olunandan sonra cədvəl burada görünəcək." />}
      />

      <Modal open={supplierModalOpen} title="Təchizatçı əlavə et" onClose={() => setSupplierModalOpen(false)} widthClassName="max-w-lg">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Kod</label>
            <Input value={supplierForm.code} onChange={(event) => setSupplierForm((current) => ({ ...current, code: event.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ad</label>
            <Input value={supplierForm.name} onChange={(event) => setSupplierForm((current) => ({ ...current, name: event.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Telefon</label>
            <Input value={supplierForm.phone} onChange={(event) => setSupplierForm((current) => ({ ...current, phone: event.target.value }))} />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setSupplierModalOpen(false)}>
            Bağla
          </Button>
          <Button onClick={() => void submitSupplier()} disabled={saving}>
            {saving ? 'Yazılır...' : 'Yadda saxla'}
          </Button>
        </div>
      </Modal>

      <Modal open={purchaseModalOpen} title="Alış əlavə et" onClose={() => setPurchaseModalOpen(false)} widthClassName="max-w-xl">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Təchizatçı</label>
            <select
              value={purchaseForm.supplierId}
              onChange={(event) => setPurchaseForm((current) => ({ ...current, supplierId: event.target.value }))}
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
            <label className="mb-1 block text-sm font-medium text-slate-700">Alış məbləği</label>
            <Input type="number" value={purchaseForm.amount} onChange={(event) => setPurchaseForm((current) => ({ ...current, amount: Number(event.target.value) }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ödəniş</label>
            <Input type="number" value={purchaseForm.paymentAmount} onChange={(event) => setPurchaseForm((current) => ({ ...current, paymentAmount: Number(event.target.value) }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ödəniş növü</label>
            <select
              value={purchaseForm.paymentType}
              onChange={(event) => setPurchaseForm((current) => ({ ...current, paymentType: event.target.value }))}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
            >
              <option value={SalesPaymentType.HESAB}>Hesab</option>
              <option value={SalesPaymentType.KART}>Kart</option>
              <option value={SalesPaymentType.NEGD}>Nəğd</option>
              <option value={SalesPaymentType.KASSA}>Kassa</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Qeyd</label>
            <textarea
              value={purchaseForm.comment}
              onChange={(event) => setPurchaseForm((current) => ({ ...current, comment: event.target.value }))}
              className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none"
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setPurchaseModalOpen(false)}>
            Bağla
          </Button>
          <Button onClick={() => void submitPurchase()} disabled={saving}>
            {saving ? 'Yazılır...' : 'Yadda saxla'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

