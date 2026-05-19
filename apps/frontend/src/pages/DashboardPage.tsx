import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlarmClock,
  CreditCard,
  Factory,
  LayoutGrid,
  Package2,
  Percent,
  ReceiptText,
  TrendingUp,
  Users2,
  Wallet
} from 'lucide-react';
import type { DashboardSummary, InventorySummary } from '@bestapp/shared';
import { analyticsClient } from '../shared/api/analytics';
import { inventoryClient } from '../shared/api/inventory';
import { StatCard, PageHeader, DataTable, StatusBadge, LoadingState, ErrorState, EmptyState } from '../shared/components';
import { formatCurrency, formatDateOnly, formatPercent } from '../shared/lib/format';
import { Button, Card } from '@bestapp/ui';

type DashboardState = {
  dashboard?: DashboardSummary;
  inventory?: InventorySummary;
  loading: boolean;
  error?: string | null;
};

export function DashboardPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<DashboardState>({ loading: true });

  const load = async () => {
    setState({ loading: true, error: null });
    try {
      const [dashboard, inventory] = await Promise.all([
        analyticsClient.dashboard(),
        inventoryClient.summary()
      ]);
      setState({ dashboard, inventory, loading: false, error: null });
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : 'Не удалось загрузить dashboard'
      });
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const dashboard = state.dashboard;
  const inventory = state.inventory;

  const topCustomers = useMemo(() => dashboard?.topCustomers ?? [], [dashboard]);
  const recentOrders = useMemo(() => dashboard?.recentOrders ?? [], [dashboard]);
  const recentPayments = useMemo(() => dashboard?.recentPayments ?? [], [dashboard]);
  const lowStockMaterials = useMemo(() => inventory?.materialsBelowMinimum ?? [], [inventory]);

  const kpis = [
    { label: 'Заказов всего', value: String(dashboard?.totalOrders ?? 0), icon: LayoutGrid, accent: 'slate' as const },
    { label: 'В производстве', value: String(dashboard?.ordersInProduction ?? 0), icon: Factory, accent: 'sky' as const },
    { label: 'Готовые', value: String(dashboard?.readyOrders ?? 0), icon: Package2, accent: 'emerald' as const },
    { label: 'Просроченные', value: String(dashboard?.overdueOrders ?? 0), icon: AlarmClock, accent: 'rose' as const },
    { label: 'Выручка', value: formatCurrency(dashboard?.totalRevenue), icon: ReceiptText, accent: 'slate' as const },
    { label: 'Оплачено', value: formatCurrency(dashboard?.totalPaid), icon: CreditCard, accent: 'emerald' as const },
    { label: 'Долги клиентов', value: formatCurrency(dashboard?.totalDebt), icon: Wallet, accent: 'amber' as const },
    { label: 'Касса', value: formatCurrency(dashboard?.cashboxBalance), icon: Wallet, accent: 'sky' as const },
    { label: 'Прибыль месяца', value: formatCurrency(dashboard?.monthProfit), icon: TrendingUp, accent: 'emerald' as const },
    { label: 'Low stock', value: String(dashboard?.lowStockMaterials ?? 0), icon: Percent, accent: 'rose' as const }
  ];

  if (state.loading) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Dashboard"
          description="Оперативная панель директора и менеджеров типографии."
        />
        <LoadingState rows={3} />
      </div>
    );
  }

  if (state.error) {
    return <ErrorState description={state.error} onRetry={() => void load()} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        description="Ключевые показатели: заказы, производство, склад, деньги и прибыль."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/inventory')}>
              Склад
            </Button>
            <Button onClick={() => navigate('/orders/new')}>Новый заказ</Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} icon={item.icon} accent={item.accent} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Последние заказы</h2>
              <p className="mt-1 text-sm text-slate-500">Актуальный поток по production и finance.</p>
            </div>
            <Button variant="secondary" onClick={() => navigate('/orders')}>
              Все заказы
            </Button>
          </div>

          <DataTable
            rowKey={(row) => row.id}
            data={recentOrders}
            columns={[
              {
                key: 'number',
                header: 'Заказ',
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
                render: (row) => row.customer?.name ?? '—'
              },
              {
                key: 'status',
                header: 'Статус',
                render: (row) => <StatusBadge kind="order" status={row.status} />
              },
              {
                key: 'deadline',
                header: 'Дедлайн',
                render: (row) => formatDateOnly(row.deadlineAt)
              },
              {
                key: 'amount',
                header: 'Сумма',
                render: (row) => formatCurrency(row.totalAmount)
              }
            ]}
            emptyState={
              <EmptyState
                title="Нет заказов"
                description="После создания заказов они появятся здесь автоматически."
              />
            }
          />
        </Card>

        <div className="space-y-5">
          <Card className="border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-950">Последние оплаты</h2>
              <p className="mt-1 text-sm text-slate-500">Движение денег и кассы.</p>
            </div>
            <div className="space-y-3">
              {recentPayments.length ? (
                recentPayments.map((payment) => (
                  <div key={payment.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-950">
                          {payment.reference ?? payment.invoice?.number ?? payment.order?.number ?? 'Платеж'}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {formatDateOnly(payment.paidAt ?? payment.createdAt)}
                        </div>
                      </div>
                      <StatusBadge kind="payment" status={payment.status} />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-slate-500">{payment.method}</span>
                      <span className="font-semibold text-slate-950">{formatCurrency(payment.amount)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState title="Оплат пока нет" description="Когда будут платежи, они появятся здесь." />
              )}
            </div>
          </Card>

          <Card className="border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Топ клиенты</h2>
            <div className="mt-4 space-y-3">
              {topCustomers.length ? (
                topCustomers.map((customer) => (
                  <div key={customer.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-950">{customer.name}</div>
                        <div className="truncate text-xs text-slate-500">{customer.companyName ?? '—'}</div>
                      </div>
                      <div className="text-sm font-semibold text-slate-950">{formatCurrency(customer.totalAmount)}</div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState title="Нет данных" description="Соберите первые заказы, чтобы увидеть лидеров." />
              )}
            </div>
          </Card>

          <Card className="border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Материалы, которые заканчиваются</h2>
            <div className="mt-4 space-y-3">
              {lowStockMaterials.length ? (
                lowStockMaterials.map((material) => (
                  <div key={material.id} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-950">{material.name}</div>
                        <div className="text-xs text-slate-500">
                          Остаток {material.available} {material.unit} · минимум {material.minStockLevel}
                        </div>
                      </div>
                      <StatusBadge kind="movement" status="adjustment" label="Low" />
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState title="Склад в норме" description="Критичных позиций ниже минимума нет." />
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

