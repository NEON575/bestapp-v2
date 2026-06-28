import { useEffect, useState, type ReactNode } from 'react';
import { Button, Input } from '@bestapp/ui';
import { Eye, PencilLine, Plus, Trash2, Truck } from 'lucide-react';
import type { SupplierItem } from '@bestapp/shared';
import { suppliersClient } from '../shared/api/suppliers';
import { ConfirmDialog, DataTable, EmptyState, ErrorState, FilterBar, LoadingState, Modal, PageHeader, Pagination, SearchInput, StatusBadge } from '../shared/components';
import { useToast } from '../shared/toast/toast-context';

type SupplierStatus = 'all' | 'active' | 'inactive';
type Mode = 'create' | 'edit' | 'view';

type SupplierFormState = {
  code: string;
  name: string;
  phone: string;
  email: string;
  taxId: string;
  address: string;
  notes: string;
  isActive: boolean;
};

const emptyForm: SupplierFormState = {
  code: '',
  name: '',
  phone: '',
  email: '',
  taxId: '',
  address: '',
  notes: '',
  isActive: true
};

const statusOptions: Array<{ value: SupplierStatus; label: string }> = [
  { value: 'all', label: 'Hamısı' },
  { value: 'active', label: 'Aktiv' },
  { value: 'inactive', label: 'Passiv' }
];

function toFormState(item?: SupplierItem | null): SupplierFormState {
  if (!item) return emptyForm;

  return {
    code: item.code ?? '',
    name: item.name ?? '',
    phone: item.phone ?? '',
    email: item.email ?? '',
    taxId: item.taxId ?? '',
    address: item.address ?? '',
    notes: item.notes ?? '',
    isActive: item.isActive
  };
}

function SupplierForm({
  title,
  description,
  form,
  onChange,
  onSubmit,
  onClose,
  saving,
  readOnly = false
}: {
  title: string;
  description?: string;
  form: SupplierFormState;
  onChange: (patch: Partial<SupplierFormState>) => void;
  onSubmit: () => void;
  onClose: () => void;
  saving: boolean;
  readOnly?: boolean;
}) {
  return (
    <Modal open title={title} description={description} onClose={onClose} widthClassName="max-w-4xl">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Kod">
            <Input value={form.code} onChange={(event) => onChange({ code: event.target.value })} disabled={readOnly} placeholder="Boş saxlayın, avtomatik yaransın" />
          </Field>
          <Field label="Təchizatçı adı">
            <Input value={form.name} onChange={(event) => onChange({ name: event.target.value })} disabled={readOnly} required />
          </Field>
          <Field label="Telefon">
            <Input value={form.phone} onChange={(event) => onChange({ phone: event.target.value })} disabled={readOnly} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(event) => onChange({ email: event.target.value })} disabled={readOnly} />
          </Field>
          <Field label="VÖEN">
            <Input value={form.taxId} onChange={(event) => onChange({ taxId: event.target.value })} disabled={readOnly} />
          </Field>
          <Field label="Ünvan">
            <Input value={form.address} onChange={(event) => onChange({ address: event.target.value })} disabled={readOnly} />
          </Field>
          <Field label="Qeyd" className="md:col-span-2">
            <textarea
              rows={4}
              value={form.notes}
              onChange={(event) => onChange({ notes: event.target.value })}
              disabled={readOnly}
              className="w-full rounded-2xl border border-white/20 bg-white/85 px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-cyan-400/70 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 disabled:bg-slate-100"
            />
          </Field>
          <label className="inline-flex items-center gap-3 rounded-2xl border border-white/20 bg-white/80 px-4 py-3 text-sm font-medium text-slate-700 md:col-span-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => onChange({ isActive: event.target.checked })}
              disabled={readOnly}
            />
            Aktiv
          </label>
        </div>

        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 bg-white/90 px-1 py-4 backdrop-blur-md">
          <div className="text-sm text-slate-500">{readOnly ? 'Yalnız baxış rejimi' : 'Məlumatları yoxlayıb yadda saxlayın.'}</div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onClose}>
              Bağla
            </Button>
            {!readOnly ? (
              <Button onClick={onSubmit} disabled={saving}>
                {saving ? 'Yadda saxlanılır...' : 'Yadda saxla'}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function SuppliersPage() {
  const toast = useToast();
  const [rows, setRows] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState({ page: 1, limit: 20, search: '', status: 'all' as SupplierStatus });
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [mode, setMode] = useState<Mode>('create');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SupplierItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierFormState>(emptyForm);

  const load = async (nextQuery = query) => {
    setLoading(true);
    setError(null);
    try {
      const response = await suppliersClient.list(nextQuery);
      setRows(response.data);
      setMeta(response.meta);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Təchizatçılar yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(query);
    }, 200);

    return () => window.clearTimeout(timer);
  }, [query.page, query.limit, query.search, query.status]);

  const openCreate = () => {
    setMode('create');
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openView = (row: SupplierItem) => {
    setMode('view');
    setEditingId(row.id);
    setForm(toFormState(row));
    setModalOpen(true);
  };

  const openEdit = (row: SupplierItem) => {
    setMode('edit');
    setEditingId(row.id);
    setForm(toFormState(row));
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.warning('Təchizatçı adı boş ola bilməz');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: form.code.trim() || undefined,
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        taxId: form.taxId.trim() || undefined,
        address: form.address.trim() || undefined,
        notes: form.notes.trim() || undefined,
        isActive: form.isActive
      };

      if (mode === 'edit' && editingId) {
        await suppliersClient.update(editingId, payload);
        toast.success('Təchizatçı yeniləndi');
      } else {
        await suppliersClient.create(payload);
        toast.success('Təchizatçı yaradıldı');
      }

      closeModal();
      await load(query);
    } catch (saveError) {
      toast.error(mode === 'edit' ? 'Təchizatçı yenilənmədi' : 'Təchizatçı yaradılmadı', saveError instanceof Error ? saveError.message : 'Xəta baş verdi');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: SupplierItem) => {
    if (!window.confirm('Bu təchizatçı silinsin?')) {
      return;
    }

    try {
      await suppliersClient.remove(row.id);
      toast.success('Təchizatçı silindi');
      await load(query);
    } catch (removeError) {
      toast.error('Təchizatçı silinmədi', removeError instanceof Error ? removeError.message : 'Xəta baş verdi');
    }
  };

  if (loading && !rows.length) {
    return (
      <div className="space-y-5">
        <PageHeader title="Təchizatçılar" description="Material aldığınız təchizatçıları idarə edin" actions={<Button onClick={openCreate}>Yeni təchizatçı</Button>} />
        <LoadingState rows={4} />
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Təchizatçılar yüklənmədi" description={error} onRetry={() => void load(query)} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Təchizatçılar"
        description="Material aldığınız təchizatçıları idarə edin"
        actions={
          <Button onClick={openCreate}>
            <span className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Yeni təchizatçı
            </span>
          </Button>
        }
      />

      <FilterBar>
        <div className="w-full lg:max-w-md">
          <SearchInput value={query.search} onChange={(value) => setQuery((current) => ({ ...current, page: 1, search: value }))} placeholder="Təchizatçı axtar" />
        </div>
        <div className="w-full lg:w-56">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Status</span>
            <select
              value={query.status}
              onChange={(event) => setQuery((current) => ({ ...current, page: 1, status: event.target.value as SupplierStatus }))}
              className="h-11 w-full rounded-2xl border border-white/20 bg-white/85 px-4 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-cyan-400/70 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
            >
              {statusOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </FilterBar>

      <DataTable
        rowKey={(row) => row.id}
        data={rows}
        columns={[
          { key: 'code', header: 'Kod', render: (row) => row.code ?? '—' },
          { key: 'name', header: 'Ad', render: (row) => row.name },
          { key: 'phone', header: 'Telefon', render: (row) => row.phone ?? '—' },
          { key: 'email', header: 'Email', render: (row) => row.email ?? '—' },
          { key: 'taxId', header: 'VÖEN', render: (row) => row.taxId ?? '—' },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <StatusBadge label={row.isActive ? 'Aktiv' : 'Passiv'} tone={row.isActive ? 'success' : 'muted'} />
          },
          {
            key: 'actions',
            header: 'Əməliyyatlar',
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" className="h-9 px-3" onClick={() => openView(row)}>
                  <span className="inline-flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Bax
                  </span>
                </Button>
                <Button variant="secondary" className="h-9 px-3" onClick={() => openEdit(row)}>
                  <span className="inline-flex items-center gap-2">
                    <PencilLine className="h-4 w-4" />
                    Redaktə
                  </span>
                </Button>
                <Button variant="ghost" className="h-9 px-3 text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => { setDeleteTarget(row); setConfirmOpen(true); }}>
                  <span className="inline-flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    Sil
                  </span>
                </Button>
              </div>
            )
          }
        ]}
        emptyState={
          <EmptyState
            title="Təchizatçı tapılmadı"
            description="Yeni təchizatçı əlavə etməklə siyahını doldurun."
            icon={Truck}
            actionLabel="Yeni təchizatçı"
            onAction={openCreate}
          />
        }
      />

      <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={(page) => setQuery((current) => ({ ...current, page }))} />

      {modalOpen ? (
        <SupplierForm
          title={mode === 'create' ? 'Yeni təchizatçı' : mode === 'edit' ? 'Təchizatçını redaktə et' : 'Təchizatçı məlumatı'}
          description={mode === 'view' ? 'Məlumatlar yalnız oxunur.' : 'Formu doldurun və yadda saxlayın.'}
          form={form}
          onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
          onSubmit={() => void save()}
          onClose={closeModal}
          saving={saving}
          readOnly={mode === 'view'}
        />
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title="Bu təchizatçı silinsin?"
        description={deleteTarget ? `${deleteTarget.code ?? ''} ${deleteTarget.name}`.trim() : undefined}
        confirmLabel="Sil"
        cancelLabel="Ləğv et"
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await remove(deleteTarget);
          setConfirmOpen(false);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block space-y-2 ${className ?? ''}`}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
