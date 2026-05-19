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
    address: '',
    notes: ''
  });

  const load = async (nextQuery = query) => {
    setLoading(true);
    setError(null);
    try {
      const response = await customersClient.list(nextQuery);
      setRows(response.data);
      setMeta(response.meta);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить клиентов');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.page, query.limit, query.search]);

  const updateQuery = (patch: Partial<typeof query>) => {
    setQuery((current) => ({ ...current, ...patch, page: patch.search !== undefined ? 1 : current.page }));
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    try {
      await customersClient.create(form);
      setForm({ name: '', companyName: '', phone: '', email: '', address: '', notes: '' });
      setShowCreate(false);
      await load(query);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось создать клиента');
    } finally {
      setCreating(false);
    }
  };

  if (loading && !rows.length) {
    return (
      <div className="space-y-5">
        <PageHeader title="Клиенты" description="CRM-список клиентов и их взаимодействий." />
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
        title="Клиенты"
        description="Карточки клиентов, контакты и история работы."
        actions={<Button variant="secondary" onClick={() => setShowCreate((value) => !value)}>{showCreate ? 'Скрыть форму' : 'Создать клиента'}</Button>}
      />

      <FilterBar>
        <div className="w-full lg:max-w-md">
          <SearchInput value={query.search} onChange={(value) => updateQuery({ search: value })} placeholder="Поиск клиента" />
        </div>
      </FilterBar>

      {showCreate ? (
        <Card className="border-slate-200 bg-white p-5 shadow-sm">
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" onSubmit={handleCreate}>
            <Field label="Имя">
              <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
            </Field>
            <Field label="Компания">
              <Input value={form.companyName} onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))} />
            </Field>
            <Field label="Телефон">
              <Input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
            </Field>
            <Field label="Электронная почта">
              <Input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            </Field>
            <Field label="Адрес">
              <Input value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
            </Field>
            <Field label="Заметки">
              <Input value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
            </Field>
            <div className="md:col-span-2 xl:col-span-3 flex justify-end">
              <Button type="submit" disabled={creating}>
                {creating ? 'Создаем...' : 'Создать клиента'}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <DataTable
        rowKey={(row) => row.id}
        data={rows}
        columns={[
          { key: 'name', header: 'Имя', render: (row) => row.name },
          { key: 'company', header: 'Компания', render: (row) => row.companyName ?? '—' },
          { key: 'phone', header: 'Телефон', render: (row) => row.phone ?? '—' },
          { key: 'email', header: 'Электронная почта', render: (row) => row.email ?? '—' },
          { key: 'address', header: 'Адрес', render: (row) => row.address ?? '—' },
          { key: 'notes', header: 'Заметки', render: (row) => row.notes ?? '—' },
          {
            key: 'orders',
            header: 'Заказы',
            render: (row) => row.totalOrders ?? 0
          },
          {
            key: 'created',
            header: 'Создан',
            render: (row) => formatDateOnly(row.createdAt)
          },
          {
            key: 'actions',
            header: 'Действия',
            render: (row) => (
              <Button variant="secondary" onClick={() => navigate(`/customers/${row.id}`)}>
                Открыть
              </Button>
            )
          }
        ]}
        emptyState={<EmptyState title="Клиенты не найдены" description="Создайте первого клиента." />}
      />

      <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={(page) => updateQuery({ page })} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
