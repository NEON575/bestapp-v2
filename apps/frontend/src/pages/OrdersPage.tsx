import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CustomerListItem, OrderListItem, OrderListQueryDto } from '@bestapp/shared';
import { OrderStatus } from '@bestapp/shared';
import { Button, Card, Input } from '@bestapp/ui';
import { customersClient } from '../shared/api/customers';
import { ordersClient } from '../shared/api/orders';
import { getOrderStatusLabel } from '../shared/lib/order';
import {
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  StatusBadge
} from '../shared/components';
import { formatCurrency, formatDateOnly } from '../shared/lib/format';
import { OrderCreateForm } from './OrderCreateForm';

const orderStatusOptions = [
  { value: '', label: 'Bütün statuslar' },
  { value: OrderStatus.DRAFT, label: 'Qaralama' },
  { value: OrderStatus.CALCULATED, label: 'Hesablanıb' },
  { value: OrderStatus.APPROVED, label: 'Təsdiqlənib' },
  { value: OrderStatus.IN_PRODUCTION, label: 'İstehsalda' },
  { value: OrderStatus.READY, label: 'Hazır' },
  { value: OrderStatus.DELIVERED, label: 'Təhvil verilib' },
  { value: OrderStatus.CANCELLED, label: 'Ləğv olunub' }
];

const transitions: Record<string, string[]> = {
  [OrderStatus.DRAFT]: [OrderStatus.CALCULATED, OrderStatus.CANCELLED],
  [OrderStatus.CALCULATED]: [OrderStatus.APPROVED, OrderStatus.CANCELLED],
  [OrderStatus.APPROVED]: [OrderStatus.IN_PRODUCTION, OrderStatus.CANCELLED],
  [OrderStatus.IN_PRODUCTION]: [OrderStatus.READY, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: []
};

type QueryState = OrderListQueryDto & {
  customerId: string;
  managerId: string;
  hasDebt: boolean;
  inProduction: boolean;
  overdue: boolean;
};

export function OrdersPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<OrderListItem[]>([]);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [query, setQuery] = useState<QueryState>({
    page: 1,
    limit: 10,
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    dateFrom: '',
    dateTo: '',
    customerId: '',
    managerId: '',
    hasDebt: false,
    inProduction: false,
    overdue: false,
    status: ''
  });
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createOrderOpen, setCreateOrderOpen] = useState(false);

  const load = async (nextQuery = query) => {
    setLoading(true);
    setError(null);
    try {
      const [ordersResponse, customersResponse] = await Promise.all([
        ordersClient.list(nextQuery),
        customersClient.list({ page: 1, limit: 100, search: '' })
      ]);

      setRows(ordersResponse.data);
      setMeta(ordersResponse.meta);
      setCustomers(customersResponse.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sifarişlər yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.page, query.limit, query.search, query.sortBy, query.sortOrder, query.dateFrom, query.dateTo, query.status, query.customerId, query.managerId, query.hasDebt, query.inProduction, query.overdue]);

  const customerOptions = useMemo(() => customers.map((customer) => ({ value: customer.id, label: customer.name })), [customers]);

  const updateQuery = (patch: Partial<QueryState>) => {
    setQuery((current) => ({
      ...current,
      ...patch,
      page: patch.page ?? (Object.keys(patch).some((key) => key !== 'page') ? 1 : current.page)
    }));
  };

  const changeStatus = async (order: OrderListItem, nextStatus: string) => {
    if (!nextStatus || nextStatus === order.status) {
      return;
    }

    setSavingId(order.id);
    try {
      await ordersClient.update(order.id, { status: nextStatus });
      await load(query);
    } finally {
      setSavingId(null);
    }
  };

  if (loading && !rows.length) {
    return (
      <div className="space-y-5">
        <PageHeader title="Sifarişlər" description="Sifariş siyahısı, filtrlər və sürətli əməliyyatlar." />
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
        title="Sifarişlər"
        description="Sifarişlərin tam siyahısı: status, müştəri, menecer, məbləğ və təhvil tarixi."
        actions={<Button onClick={() => setCreateOrderOpen(true)}>Yeni sifariş</Button>}
      />

      <FilterBar>
        <div className="w-full lg:max-w-sm">
          <SearchInput
            value={query.search ?? ''}
            onChange={(value) => updateQuery({ search: value, page: 1 })}
            placeholder="Nömrə, müştəri və ya menecer üzrə axtar"
          />
        </div>

        <div className="w-full lg:w-44">
          <select
            value={query.status}
            onChange={(event) => updateQuery({ status: event.target.value, page: 1 })}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
          >
            {orderStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full lg:w-56">
          <select
            value={query.customerId}
            onChange={(event) => updateQuery({ customerId: event.target.value, page: 1 })}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
          >
            <option value="">Bütün müştərilər</option>
            {customerOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full lg:w-44">
          <Input value={query.managerId} onChange={(event) => updateQuery({ managerId: event.target.value, page: 1 })} placeholder="Menecer ID-si" />
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-slate-600">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={query.hasDebt} onChange={(event) => updateQuery({ hasDebt: event.target.checked, page: 1 })} />
            Borcu var
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={query.inProduction} onChange={(event) => updateQuery({ inProduction: event.target.checked, page: 1 })} />
            İstehsaldadır
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={query.overdue} onChange={(event) => updateQuery({ overdue: event.target.checked, page: 1 })} />
            Gecikmişlər
          </label>
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto">
          <Input type="date" value={query.dateFrom ?? ''} onChange={(event) => updateQuery({ dateFrom: event.target.value, page: 1 })} />
          <Input type="date" value={query.dateTo ?? ''} onChange={(event) => updateQuery({ dateTo: event.target.value, page: 1 })} />
        </div>
      </FilterBar>

      <DataTable
        rowKey={(row) => row.id}
        data={rows}
        columns={[
          {
            key: 'number',
            header: 'Nömrə',
            render: (row) => (
              <div>
                <div className="font-semibold text-slate-950">{row.number}</div>
                <div className="text-xs text-slate-500">{formatDateOnly(row.createdAt)}</div>
              </div>
            )
          },
          {
            key: 'customer',
            header: 'Müştəri',
            render: (row) => (
              <div>
                <div className="font-medium text-slate-950">{row.customer?.name ?? '—'}</div>
                <div className="text-xs text-slate-500">{row.customer?.companyName ?? ''}</div>
              </div>
            )
          },
          {
            key: 'manager',
            header: 'Menecer',
            render: (row) => row.manager?.fullName ?? '—'
          },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <StatusBadge kind="order" status={row.status} />
          },
          {
            key: 'sum',
            header: 'Məbləğ',
            render: (row) => formatCurrency(row.totalAmount)
          },
          {
            key: 'paid',
            header: 'Ödənilib',
            render: (row) => formatCurrency(row.paidAmount)
          },
          {
            key: 'debt',
            header: 'Borc',
            render: (row) => formatCurrency(row.customerDebtAmount)
          },
          {
            key: 'deadline',
            header: 'Təhvil tarixi',
            render: (row) => formatDateOnly(row.deadlineAt)
          },
          {
            key: 'actions',
            header: 'Əməliyyatlar',
            className: 'w-[260px]',
            render: (row) => (
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" onClick={() => navigate(`/orders/${row.id}`)}>
                  Aç
                </Button>
                <select
                  value=""
                  disabled={savingId === row.id}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => void changeStatus(row, event.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="">{savingId === row.id ? 'Yadda saxlanılır...' : 'Statusu dəyiş'}</option>
                  {transitions[row.status]?.map((status) => (
                    <option key={status} value={status}>
                      {getOrderStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </div>
            )
          }
        ]}
        emptyState={
          <EmptyState
            title="Sifariş yoxdur"
            description="İlk sifarişi yaradın və iş axınını burada izləməyə başlayın."
            actionLabel="Yeni sifariş"
            onAction={() => setCreateOrderOpen(true)}
          />
        }
      />

      <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={(page) => updateQuery({ page })} />
      <Card className="border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
        Cəmi: <span className="font-semibold text-slate-950">{meta.total}</span>
      </Card>

      <Modal open={createOrderOpen} title="Yeni sifariş" onClose={() => setCreateOrderOpen(false)} widthClassName="max-w-5xl">
        <OrderCreateForm
          submitLabel="Yadda saxla"
          cancelLabel="Bağla"
          onCancel={() => setCreateOrderOpen(false)}
          onCreated={async () => {
            setCreateOrderOpen(false);
            await load(query);
          }}
        />
      </Modal>
    </div>
  );
}
