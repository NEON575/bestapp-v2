import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { OrderDetail } from '@bestapp/shared';
import { Button, Card } from '@bestapp/ui';
import { ordersClient } from '../shared/api/orders';
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StatusBadge
} from '../shared/components';
import { useToast } from '../shared/toast/toast-context';
import { formatCurrency, formatDateOnly, formatPercent } from '../shared/lib/format';
import {
  getNextOrderWorkflowAction,
  getOrderWorkflowActionLabel,
  isOrderCancelable,
  type OrderWorkflowAction
} from '../shared/lib/order';

type ConfirmState =
  | {
      action: 'approve' | 'startProduction' | 'deliver' | 'cancel';
      title: string;
      description: string;
      confirmLabel: string;
    }
  | null;

export function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<OrderWorkflowAction | 'cancel' | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  const load = async () => {
    if (!id) {
      setError('Неверный идентификатор заказа');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await ordersClient.get(id);
      setOrder(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить заказ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const nextAction = useMemo(() => getNextOrderWorkflowAction(order?.status), [order?.status]);
  const profitability = useMemo(() => order?.profitability, [order]);

  const promptAction = (action: 'approve' | 'startProduction' | 'deliver') => {
    const meta = {
      approve: {
        title: 'Утвердить заказ',
        description: 'После утверждения заказ можно будет передать в производство.',
        confirmLabel: 'Утвердить'
      },
      startProduction: {
        title: 'Запустить производство',
        description: 'Будут созданы производственные задания и складские резервы.',
        confirmLabel: 'Запустить'
      },
      deliver: {
        title: 'Выдать заказ',
        description: 'Заказ перейдет в статус "Выдан" и станет завершенным.',
        confirmLabel: 'Выдать'
      }
    }[action];

    setConfirmState({ action, ...meta });
  };

  const runWorkflow = async (action: OrderWorkflowAction) => {
    if (!id) return;
    setActionLoading(action);
    try {
      await ordersClient[action](id);
      toast.success('Действие выполнено', getOrderWorkflowActionLabel(action));
      await load();
    } catch (e) {
      toast.error('Не удалось выполнить действие', e instanceof Error ? e.message : 'Повторите попытку позже');
    } finally {
      setActionLoading(null);
    }
  };

  const runCancel = async () => {
    if (!id) return;
    setActionLoading('cancel');
    try {
      await ordersClient.remove(id);
      toast.warning('Заказ отменен', 'Заказ был удален из рабочего потока');
      navigate('/orders');
    } catch (e) {
      toast.error('Не удалось отменить заказ', e instanceof Error ? e.message : 'Повторите попытку позже');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <LoadingState rows={5} />;
  }

  if (error) {
    return <ErrorState description={error} onRetry={() => void load()} />;
  }

  if (!order) {
    return <EmptyState title="Заказ не найден" actionLabel="К списку заказов" onAction={() => navigate('/orders')} />;
  }

  const canCancel = isOrderCancelable(order.status);

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Заказ ${order.number}`}
        description="Полная карточка заказа, расчет, производство, склад, оплаты и история изменений."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/orders')}>
              К списку
            </Button>
            {nextAction ? (
              <Button
                onClick={() =>
                  nextAction === 'approve' || nextAction === 'startProduction' || nextAction === 'deliver'
                    ? promptAction(nextAction)
                    : void runWorkflow(nextAction)
                }
                disabled={actionLoading === nextAction}
              >
                {actionLoading === nextAction ? 'Выполняется...' : getOrderWorkflowActionLabel(nextAction)}
              </Button>
            ) : null}
            {canCancel ? (
              <Button
                variant="secondary"
                onClick={() =>
                  setConfirmState({
                    action: 'cancel',
                    title: 'Отменить заказ',
                    description: 'Заказ будет удален из рабочего потока и дальнейшие производственные действия станут недоступны.',
                    confirmLabel: 'Отменить заказ'
                  })
                }
                disabled={actionLoading === 'cancel'}
              >
                {actionLoading === 'cancel' ? 'Выполняется...' : 'Отменить заказ'}
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-4">
        <Card className="border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge kind="order" status={order.status} />
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {order.customer?.name ?? 'Клиент'}
            </span>
            <span className="text-sm text-slate-500">Менеджер: {order.manager?.fullName ?? '—'}</span>
          </div>

          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <Info label="Дедлайн" value={formatDateOnly(order.deadlineAt)} />
            <Info label="Создан" value={formatDateOnly(order.createdAt)} />
            <Info label="Комментарий" value={order.comment ?? '—'} />
            <Info label="Долг клиента" value={formatCurrency(order.customerDebtAmount)} />
          </dl>
        </Card>

        <Card className="border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Выручка</div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(order.totalAmount)}</div>
          <div className="mt-1 text-sm text-slate-500">Оплачено: {formatCurrency(order.paidAmount)}</div>
        </Card>

        <Card className="border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Себестоимость</div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(order.costAmount)}</div>
          <div className="mt-1 text-sm text-slate-500">Прибыль: {formatCurrency(order.profitAmount)}</div>
        </Card>

        <Card className="border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Маржа</div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{formatPercent(order.marginPercent)}</div>
          <div className="mt-1 text-sm text-slate-500">{profitability?.isProfitable ? 'Заказ прибыльный' : 'Заказ убыточный'}</div>
        </Card>
      </div>

      <Card className="border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Позиции заказа</h2>
        <div className="mt-4">
          <DataTable
            rowKey={(row) => row.id}
            data={order.items}
            columns={[
              { key: 'name', header: 'Позиция', render: (row) => row.name },
              { key: 'type', header: 'Тип', render: (row) => row.productType },
              { key: 'size', header: 'Размер', render: (row) => `${row.width} × ${row.height}` },
              { key: 'quantity', header: 'Количество', render: (row) => row.quantity },
              { key: 'color', header: 'Цветность', render: (row) => row.colorMode },
              { key: 'material', header: 'Материал', render: (row) => row.materialId ?? '—' },
              { key: 'price', header: 'Цена', render: (row) => formatCurrency(row.totalPrice) }
            ]}
            emptyState={<EmptyState title="Нет позиций" description="В заказе пока нет товарных строк." />}
          />
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Калькуляция</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Metric label="Материалы" value={formatCurrency(order.costCalculation?.materialCost)} />
            <Metric label="Печать" value={formatCurrency(order.costCalculation?.printingCost)} />
            <Metric label="Предпечатка" value={formatCurrency(order.costCalculation?.prepressCost)} />
            <Metric label="Послепечатка" value={formatCurrency(order.costCalculation?.postpressCost)} />
            <Metric label="Труд" value={formatCurrency(order.costCalculation?.laborCost)} />
            <Metric label="Накладные" value={formatCurrency(order.costCalculation?.overheadCost)} />
            <Metric label="Waste %" value={formatPercent(order.costCalculation?.wastePercent)} />
            <Metric label="Profit %" value={formatPercent(order.costCalculation?.profitPercent)} />
            <Metric label="Рекоменд. цена" value={formatCurrency(order.costCalculation?.recommendedPrice)} className="sm:col-span-2" />
          </div>

          {order.costCalculation?.lines?.length ? (
            <div className="mt-5 space-y-2">
              {order.costCalculation.lines.map((line) => (
                <div key={line.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-950">{line.name ?? line.type}</div>
                      <div className="text-xs text-slate-500">
                        {line.quantity ?? 0} × {formatCurrency(line.unitCost)}
                      </div>
                    </div>
                    <div className="font-semibold text-slate-950">{formatCurrency(line.amount)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </Card>

        <Card className="border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Производство и склад</h2>

          <div className="mt-4 space-y-4">
            <SectionTitle title="Производственные задания" />
            {order.productionJobs.length ? (
              order.productionJobs.map((job) => (
                <div key={job.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-950">{job.number}</div>
                      <div className="text-xs text-slate-500">
                        {job.route?.name ?? 'Без маршрута'} · {formatDateOnly(job.deadlineAt)}
                      </div>
                    </div>
                    <StatusBadge kind="production" status={job.status} />
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="Производство не создано" description="Сначала нужно утвердить и запустить заказ." />
            )}

            <SectionTitle title="Резервы" />
            {order.stockReservations.length ? (
              order.stockReservations.map((reservation) => (
                <div key={reservation.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-950">{reservation.material?.name ?? 'Материал'}</div>
                      <div className="text-xs text-slate-500">
                        {reservation.quantity} {reservation.material?.unit ?? ''}
                      </div>
                    </div>
                    <StatusBadge kind="reservation" status={reservation.status} />
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="Резервов нет" description="Материалы будут зарезервированы на этапе производства." />
            )}

            <SectionTitle title="Движения материалов" />
            {order.stockMovements.length ? (
              <div className="space-y-2">
                {order.stockMovements.map((movement) => (
                  <div key={movement.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-950">{movement.material?.name ?? movement.type}</div>
                        <div className="text-xs text-slate-500">
                          {movement.quantity} · {movement.warehouse?.name ?? '—'}
                        </div>
                      </div>
                      <StatusBadge kind="movement" status={movement.type} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Движений пока нет" description="Списание появится после запуска производства." />
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Счета и оплаты</h2>
          <div className="mt-4 space-y-4">
            <SectionTitle title="Счета" />
            {order.invoices.length ? (
              order.invoices.map((invoice) => (
                <div key={invoice.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-950">{invoice.number}</div>
                      <div className="text-xs text-slate-500">{formatDateOnly(invoice.dueAt)}</div>
                    </div>
                    <StatusBadge kind="invoice" status={invoice.status} />
                  </div>
                  <div className="mt-3 flex justify-between text-sm text-slate-600">
                    <span>
                      {formatCurrency(invoice.paidAmount)} / {formatCurrency(invoice.totalAmount)}
                    </span>
                    <StatusBadge kind="debt" status={invoice.receivable?.status} />
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="Счета не созданы" description="Счет появится после оформления финансовой части." />
            )}

            <SectionTitle title="Оплаты" />
            {order.payments.length ? (
              order.payments.map((payment) => (
                <div key={payment.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-950">{payment.reference ?? payment.id}</div>
                      <div className="text-xs text-slate-500">{formatDateOnly(payment.paidAt)}</div>
                    </div>
                    <StatusBadge kind="payment" status={payment.status} />
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    {formatCurrency(payment.amount)} · {payment.method}
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="Оплат нет" description="После оплаты они отобразятся здесь." />
            )}
          </div>
        </Card>

        <Card className="border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Прибыльность</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Metric label="Чистая прибыль" value={formatCurrency(order.profitability.netProfit)} />
            <Metric label="Маржа" value={formatPercent(order.profitability.marginPercent)} />
            <Metric label="Долг" value={formatCurrency(order.profitability.customerDebtAmount)} />
            <Metric label="Прибыльный" value={order.profitability.isProfitable ? 'Да' : 'Нет'} className="sm:col-span-2" />
          </div>

          <div className="mt-5">
            <SectionTitle title="История изменений" />
            <div className="mt-3 space-y-2">
              {order.auditLogs.length ? (
                order.auditLogs.map((log) => (
                  <div key={log.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-950">{log.action}</div>
                        <div className="text-xs text-slate-500">{formatDateOnly(log.createdAt)}</div>
                      </div>
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{log.entityType}</div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState title="Логов нет" description="История изменений появится после действий пользователей." />
              )}
            </div>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title ?? ''}
        description={confirmState?.description}
        confirmLabel={confirmState?.confirmLabel}
        onCancel={() => setConfirmState(null)}
        onConfirm={() => {
          const action = confirmState?.action;
          setConfirmState(null);
          if (!action) return;
          if (action === 'cancel') {
            void runCancel();
          } else {
            void runWorkflow(action);
          }
        }}
        loading={actionLoading !== null}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-semibold leading-6 text-slate-950">{value}</dd>
    </div>
  );
}

function Metric({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 ${className ?? ''}`}>
      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{title}</div>;
}
