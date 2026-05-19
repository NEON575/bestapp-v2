import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { CustomerListItem, OrderListItem } from '@bestapp/shared';
import { Button, Card } from '@bestapp/ui';
import { customersClient } from '../shared/api/customers';
import { ordersClient } from '../shared/api/orders';
import { DataTable, EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from '../shared/components';
import { formatCurrency, formatDateOnly } from '../shared/lib/format';

export function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<CustomerListItem | null>(null);
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!id) {
      setError('Неверный идентификатор клиента');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [customerResponse, ordersResponse] = await Promise.all([
        customersClient.get(id),
        ordersClient.list({ page: 1, limit: 10, customerId: id })
      ]);
      setCustomer(customerResponse);
      setOrders(ordersResponse.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить клиента');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  if (loading) {
    return <LoadingState rows={4} />;
  }

  if (error) {
    return <ErrorState description={error} onRetry={() => void load()} />;
  }

  if (!customer) {
    return <EmptyState title="Клиент не найден" actionLabel="К списку клиентов" onAction={() => navigate('/customers')} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={customer.name}
        description="Полная карточка клиента и связанные заказы."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/customers')}>
              К списку
            </Button>
            <Button onClick={() => navigate('/orders/new')}>Новый заказ</Button>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
          <h2 className="text-lg font-semibold text-slate-950">Контакты</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <p>Компания: {customer.companyName ?? '—'}</p>
            <p>Телефон: {customer.phone ?? '—'}</p>
            <p>Email: {customer.email ?? '—'}</p>
            <p>Адрес: {customer.address ?? '—'}</p>
            <p>Заметки: {customer.notes ?? '—'}</p>
            <p>Создан: {formatDateOnly(customer.createdAt)}</p>
          </div>
        </Card>

        <Card className="border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <h2 className="text-lg font-semibold text-slate-950">Заказы клиента</h2>
          <div className="mt-4">
            <DataTable
              rowKey={(row) => row.id}
              data={orders}
              columns={[
                { key: 'number', header: 'Заказ', render: (row) => row.number },
                { key: 'status', header: 'Статус', render: (row) => <StatusBadge kind="order" status={row.status} /> },
                { key: 'total', header: 'Сумма', render: (row) => formatCurrency(row.totalAmount) },
                { key: 'debt', header: 'Долг', render: (row) => formatCurrency(row.customerDebtAmount) },
                { key: 'deadline', header: 'Дедлайн', render: (row) => formatDateOnly(row.deadlineAt) },
                {
                  key: 'actions',
                  header: 'Действия',
                  render: (row) => (
                    <Button variant="secondary" onClick={() => navigate(`/orders/${row.id}`)}>
                      Открыть
                    </Button>
                  )
                }
              ]}
              emptyState={<EmptyState title="Заказов нет" description="У этого клиента пока нет заказов." />}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
