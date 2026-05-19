import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CustomerListItem, OrderListItem, OrderListQueryDto } from '@bestapp/shared';
import { OrderStatus } from '@bestapp/shared';
import { Button, Card, Input } from '@bestapp/ui';
import { customersClient } from '../shared/api/customers';
import { ordersClient } from '../shared/api/orders';
import {
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  PageHeader,
  Pagination,
  SearchInput,
  StatusBadge
} from '../shared/components';
import { formatCurrency, formatDateOnly } from '../shared/lib/format';

const orderStatusOptions = [
  { value: '', label: 'Все статусы' },
  { value: OrderStatus.DRAFT, label: 'Черновик' },
  { value: OrderStatus.CALCULATED, label: 'Рассчитан' },
  { value: OrderStatus.APPROVED, label: 'Утвержден' },
  { value: OrderStatus.IN_PRODUCTION, label: 'В производстве' },
  { value: OrderStatus.READY, label: 'Готов' },
  { value: OrderStatus.DELIVERED, label: 'Выдан' },
  { value: OrderStatus.CANCELLED, label: 'Отменен' }
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
      setError(e instanceof Error ? e.message : 'Не удалось загрузить заказы');
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
        <PageHeader title="Orders" description="Список заказов типографии с фильтрами и быстрыми действиями." />
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
        title="Orders"
        description="Полный список заказов: статус, клиент, менеджер, суммы, долг и дедлайн."
        actions={<Button onClick={() => navigate('/orders/new')}>Создать заказ</Button>}
      />

      <FilterBar>
        <div className="w-full lg:max-w-sm">
          <SearchInput
            value={query.search ?? ''}
            onChange={(value) => updateQuery({ search: value, page: 1 })}
            placeholder="Поиск по номеру, клиенту, менеджеру"
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
            <option value="">Все клиенты</option>
            {customerOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full lg:w-44">
          <Input
            value={query.managerId}
            onChange={(event) => updateQuery({ managerId: event.target.value, page: 1 })}
            placeholder="Manager ID"
          />
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-slate-600">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={query.hasDebt}
              onChange={(event) => updateQuery({ hasDebt: event.target.checked, page: 1 })}
            />
            Есть долг
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={query.inProduction}
              onChange={(event) => updateQuery({ inProduction: event.target.checked, page: 1 })}
            />
            В производстве
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={query.overdue}
              onChange={(event) => updateQuery({ overdue: event.target.checked, page: 1 })}
            />
            Просроченные
          </label>
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto">
          <Input
            type="date"
            value={query.dateFrom ?? ''}
            onChange={(event) => updateQuery({ dateFrom: event.target.value, page: 1 })}
          />
          <Input
            type="date"
            value={query.dateTo ?? ''}
            onChange={(event) => updateQuery({ dateTo: event.target.value, page: 1 })}
          />
        </div>
      </FilterBar>

      <DataTable
        rowKey={(row) => row.id}
        data={rows}
        columns={[
          {
            key: 'number',
            header: 'Номер',
            render: (row) => (
              <div>
                <div className="font-semibold text-slate-950">{row.number}</div>
                <div className="text-xs text-slate-500">{formatDateOnly(row.createdAt)}</div>
              </div>
            )
          },
          {
            key: 'customer',
            header: 'Клиент',
            render: (row) => (
              <div>
                <div className="font-medium text-slate-950">{row.customer?.name ?? '—'}</div>
                <div className="text-xs text-slate-500">{row.customer?.companyName ?? ''}</div>
              </div>
            )
          },
          {
            key: 'manager',
            header: 'Менеджер',
            render: (row) => row.manager?.fullName ?? '—'
          },
          {
            key: 'status',
            header: 'Статус',
            render: (row) => <StatusBadge kind="order" status={row.status} />
          },
          {
            key: 'sum',
            header: 'Сумма',
            render: (row) => formatCurrency(row.totalAmount)
          },
          {
            key: 'paid',
            header: 'Оплачено',
            render: (row) => formatCurrency(row.paidAmount)
          },
          {
            key: 'debt',
            header: 'Долг',
            render: (row) => formatCurrency(row.customerDebtAmount)
          },
          {
            key: 'deadline',
            header: 'Дедлайн',
            render: (row) => formatDateOnly(row.deadlineAt)
          },
          {
            key: 'actions',
            header: 'Действия',
            className: 'w-[260px]',
            render: (row) => (
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" onClick={() => navigate(`/orders/${row.id}`)}>
                  Открыть
                </Button>
                <select
                  value=""
                  disabled={savingId === row.id}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => void changeStatus(row, event.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="">{savingId === row.id ? 'Сохраняем...' : 'Изменить статус'}</option>
                  {transitions[row.status]?.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            )
          }
        ]}
        emptyState={
          <EmptyState
            title="Заказов нет"
            description="Создайте первый заказ, чтобы увидеть поток работы типографии."
            actionLabel="Создать заказ"
            onAction={() => navigate('/orders/new')}
          />
        }
      />

      <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={(page) => updateQuery({ page })} />
      <Card className="border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
        Всего: <span className="font-semibold text-slate-950">{meta.total}</span>
      </Card>
    </div>
  );
}
