import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CustomerListItem } from '@bestapp/shared';
import { Button, Card, Input } from '@bestapp/ui';
import { customersClient } from '../shared/api/customers';
import {
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  PageHeader,
  Pagination,
  SearchInput
} from '../shared/components';
import { formatDateOnly } from '../shared/lib/format';

export function CustomersPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [query, setQuery] = useState({ page: 1, limit: 10, search: '' });
  const [form, setForm] = useState({
    name: '',
    companyName: '',
    phone: '',
    email: '',
    taxId: '',
    notes: '',
    inquiryNote: '',
    isActive: true
  });

  const load = async (nextQuery = query) => {
    setLoading(true);
    setError(null);
    try {
      const response = await customersClient.list(nextQuery);
      setRows(response.data);
      setMeta(response.meta);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Müştərilər yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(query);
  }, [query.page, query.limit, query.search]);

  const updateQuery = (patch: Partial<typeof query>) => {
    setQuery((current) => ({ ...current, ...patch, page: patch.search !== undefined ? 1 : current.page }));
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    try {
      await customersClient.create(form);
      setForm({
        name: '',
        companyName: '',
        phone: '',
        email: '',
        taxId: '',
        notes: '',
        inquiryNote: '',
        isActive: true
      });
      setShowCreate(false);
      await load(query);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Müştəri yaradılmadı');
    } finally {
      setCreating(false);
    }
  };

  if (loading && !rows.length) {
    return (
      <div className="space-y-5">
        <PageHeader title="Müştərilər" description="Müştəri bazası və satışla əlaqəli kartlar." />
        <LoadingState rows={4} />
      </div>
    );
  }

  if (error) {
    return <ErrorState description={error} onRetry={() => void load(query)} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Müştərilər"
        description="Əlaqə məlumatları, VÖEN və satış tarixçəsi üçün əsas kartlar."
        actions={
          <Button variant="secondary" onClick={() => setShowCreate((value) => !value)}>
            {showCreate ? 'Formanı gizlət' : 'Yeni müştəri'}
          </Button>
        }
      />

      <FilterBar>
        <div className="w-full lg:max-w-md">
          <SearchInput value={query.search} onChange={(value) => updateQuery({ search: value })} placeholder="Müştəri axtarışı" />
        </div>
      </FilterBar>

      {showCreate ? (
        <Card className="border-slate-200 bg-white p-5 shadow-sm">
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" onSubmit={handleCreate}>
            <Field label="Ad">
              <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
            </Field>
            <Field label="Şirkət">
              <Input value={form.companyName} onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))} />
            </Field>
            <Field label="Telefon">
              <Input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
            </Field>
            <Field label="Email">
              <Input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            </Field>
            <Field label="VÖEN">
              <Input value={form.taxId} onChange={(event) => setForm((current) => ({ ...current, taxId: event.target.value }))} />
            </Field>
            <Field label="Qeyd">
              <Input value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
            </Field>
            <Field label="Sorğu / müraciət" className="md:col-span-2 xl:col-span-3">
              <Input value={form.inquiryNote} onChange={(event) => setForm((current) => ({ ...current, inquiryNote: event.target.value }))} />
            </Field>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700 md:col-span-2 xl:col-span-3">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
              />
              Aktiv müştəri
            </label>
            <div className="md:col-span-2 xl:col-span-3 flex justify-end">
              <Button type="submit" disabled={creating}>
                {creating ? 'Yaradılır...' : 'Müştərini yarat'}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <DataTable
        rowKey={(row) => row.id}
        data={rows}
        columns={[
          { key: 'name', header: 'Ad', render: (row) => row.name },
          { key: 'company', header: 'Şirkət', render: (row) => row.companyName ?? '—' },
          { key: 'phone', header: 'Telefon', render: (row) => row.phone ?? '—' },
          { key: 'email', header: 'Email', render: (row) => row.email ?? '—' },
          { key: 'taxId', header: 'VÖEN', render: (row) => row.taxId ?? '—' },
          { key: 'notes', header: 'Qeyd', render: (row) => row.notes ?? '—' },
          { key: 'created', header: 'Yaradılıb', render: (row) => formatDateOnly(row.createdAt) },
          {
            key: 'actions',
            header: 'Əməliyyat',
            render: (row) => (
              <Button variant="secondary" onClick={() => navigate(`/customers/${row.id}`)}>
                Aç
              </Button>
            )
          }
        ]}
        emptyState={<EmptyState title="Müştəri tapılmadı" description="İlk müştərini əlavə edin." />}
      />

      <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={(page) => updateQuery({ page })} />
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
