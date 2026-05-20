import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { OrderDetail, UpdateOrderHesablamaDto } from '@bestapp/shared';
import { Button, Card, Input } from '@bestapp/ui';
import { ordersClient } from '../shared/api/orders';
import { ConfirmDialog, DataTable, EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from '../shared/components';
import { useToast } from '../shared/toast/toast-context';
import { formatCurrency, formatDateOnly, formatPercent } from '../shared/lib/format';
import { getNextOrderWorkflowAction, getOrderWorkflowActionLabel, isOrderCancelable, type OrderWorkflowAction } from '../shared/lib/order';

type ConfirmState =
  | {
      action: 'approve' | 'startProduction' | 'deliver' | 'cancel';
      title: string;
      description: string;
      confirmLabel: string;
    }
  | null;

type HesablamaForm = {
  category: string;
  productName: string;
  quantity: number;
  saleAmount: number;
  paymentAmount: number;
  bonus: number;
  customerBonus: number;
  paperCost: number;
  plateCost: number;
  printCost: number;
  specialCutCost: number;
  knifeCost: number;
  manualWorkCost: number;
  spiralCost: number;
  poniCost: number;
  otherCost: number;
  laminationCost: number;
  notes: string;
};

function createHesablamaForm(order: OrderDetail): HesablamaForm {
  const sales = order.salesEntry;

  return {
    category: sales?.category ?? '',
    productName: sales?.productName ?? order.items[0]?.name ?? order.number,
    quantity: Number(sales?.quantity ?? order.items.reduce((sum, item) => sum + Number(item.quantity), 0) ?? 0),
    saleAmount: Number(sales?.saleAmount ?? order.totalAmount ?? 0),
    paymentAmount: Number(sales?.paymentAmount ?? order.paidAmount ?? 0),
    bonus: Number(sales?.bonus ?? 0),
    customerBonus: Number(sales?.customerBonus ?? 0),
    paperCost: Number(sales?.paperCost ?? 0),
    plateCost: Number(sales?.plateCost ?? 0),
    printCost: Number(sales?.printCost ?? 0),
    specialCutCost: Number(sales?.specialCutCost ?? 0),
    knifeCost: Number(sales?.knifeCost ?? 0),
    manualWorkCost: Number(sales?.manualWorkCost ?? 0),
    spiralCost: Number(sales?.spiralCost ?? 0),
    poniCost: Number(sales?.poniCost ?? 0),
    otherCost: Number(sales?.otherCost ?? 0),
    laminationCost: Number(sales?.laminationCost ?? 0),
    notes: sales?.notes ?? ''
  };
}

function asNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [hesablama, setHesablama] = useState<HesablamaForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<OrderWorkflowAction | 'cancel' | 'hesablama' | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  const load = async () => {
    if (!id) {
      setError('Sifariş identifikatoru yanlışdır');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await ordersClient.get(id);
      setOrder(data);
      setHesablama(createHesablamaForm(data));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sifariş məlumatı yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const nextAction = useMemo(() => getNextOrderWorkflowAction(order?.status), [order?.status]);
  const profitability = useMemo(() => order?.profitability, [order]);
  const calculatedPreview = useMemo(() => {
    if (!hesablama) {
      return null;
    }

    const totalCost =
      hesablama.paperCost +
      hesablama.plateCost +
      hesablama.printCost +
      hesablama.specialCutCost +
      hesablama.knifeCost +
      hesablama.manualWorkCost +
      hesablama.spiralCost +
      hesablama.poniCost +
      hesablama.otherCost +
      hesablama.laminationCost;
    const profit = hesablama.saleAmount - hesablama.bonus - hesablama.customerBonus - totalCost;
    const profitPercent = totalCost > 0 ? (profit / totalCost) * 100 : 0;
    const remainingDebt = hesablama.saleAmount - hesablama.paymentAmount - hesablama.customerBonus;
    const finalRemainingDebt = remainingDebt - hesablama.bonus;
    const saleUnitPrice = hesablama.quantity > 0 ? hesablama.saleAmount / hesablama.quantity : 0;

    return {
      totalCost,
      profit,
      profitPercent,
      remainingDebt,
      finalRemainingDebt,
      saleUnitPrice
    };
  }, [hesablama]);

  const promptAction = (action: 'approve' | 'startProduction' | 'deliver') => {
    const meta = {
      approve: {
        title: 'Sifarişi təsdiqlə',
        description: 'Təsdiqdən sonra sifariş istehsal mərhələsinə keçməyə hazır olacaq.',
        confirmLabel: 'Təsdiqlə'
      },
      startProduction: {
        title: 'İstehsala başla',
        description: 'İstehsal tapşırıqları və anbar rezervləri bu mərhələdən sonra aktivləşəcək.',
        confirmLabel: 'Başlat'
      },
      deliver: {
        title: 'Sifarişi təhvil ver',
        description: 'Sifariş yekun təhvil statusuna keçəcək və satış jurnalı da yenilənəcək.',
        confirmLabel: 'Təhvil ver'
      }
    }[action];

    setConfirmState({ action, ...meta });
  };

  const runWorkflow = async (action: OrderWorkflowAction) => {
    if (!id) return;
    setActionLoading(action);
    try {
      await ordersClient[action](id);
      toast.success('Əməliyyat yerinə yetirildi', getOrderWorkflowActionLabel(action));
      await load();
    } catch (e) {
      toast.error('Əməliyyat icra olunmadı', e instanceof Error ? e.message : 'Bir az sonra yenidən yoxlayın');
    } finally {
      setActionLoading(null);
    }
  };

  const runCancel = async () => {
    if (!id) return;
    setActionLoading('cancel');
    try {
      await ordersClient.remove(id);
      toast.warning('Sifariş ləğv edildi', 'Qeyd iş axınından çıxarıldı');
      navigate('/orders');
    } catch (e) {
      toast.error('Sifarişi ləğv etmək alınmadı', e instanceof Error ? e.message : 'Bir az sonra yenidən yoxlayın');
    } finally {
      setActionLoading(null);
    }
  };

  const saveHesablama = async () => {
    if (!id || !hesablama) {
      return;
    }

    setActionLoading('hesablama');
    try {
      const payload: UpdateOrderHesablamaDto = {
        category: hesablama.category || undefined,
        productName: hesablama.productName,
        quantity: hesablama.quantity,
        saleAmount: hesablama.saleAmount,
        paymentAmount: hesablama.paymentAmount,
        bonus: hesablama.bonus,
        customerBonus: hesablama.customerBonus,
        paperCost: hesablama.paperCost,
        plateCost: hesablama.plateCost,
        printCost: hesablama.printCost,
        specialCutCost: hesablama.specialCutCost,
        knifeCost: hesablama.knifeCost,
        manualWorkCost: hesablama.manualWorkCost,
        spiralCost: hesablama.spiralCost,
        poniCost: hesablama.poniCost,
        otherCost: hesablama.otherCost,
        laminationCost: hesablama.laminationCost,
        notes: hesablama.notes || undefined
      };

      await ordersClient.updateHesablama(id, payload);
      toast.success('Hesablama yeniləndi', 'Xərc və xeyir göstəriciləri yenidən hesablandı');
      await load();
    } catch (e) {
      toast.error('Hesablama saxlanmadı', e instanceof Error ? e.message : 'Bir az sonra yenidən yoxlayın');
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

  if (!order || !hesablama) {
    return <EmptyState title="Sifariş tapılmadı" actionLabel="Sifariş siyahısına qayıt" onAction={() => navigate('/orders')} />;
  }

  const canCancel = isOrderCancelable(order.status);

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Sifariş ${order.number}`}
        description="Tam kart: sifariş, hesablanma, istehsal, anbar, qaimə, ödəniş və dəyişiklik tarixi."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/orders')}>
              Siyahıya qayıt
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
                {actionLoading === nextAction ? 'İcra olunur...' : getOrderWorkflowActionLabel(nextAction)}
              </Button>
            ) : null}
            {canCancel ? (
              <Button
                variant="secondary"
                onClick={() =>
                  setConfirmState({
                    action: 'cancel',
                    title: 'Sifarişi ləğv et',
                    description: 'Bu əməliyyatdan sonra sifariş aktiv iş axınından çıxacaq.',
                    confirmLabel: 'Ləğv et'
                  })
                }
                disabled={actionLoading === 'cancel'}
              >
                {actionLoading === 'cancel' ? 'İcra olunur...' : 'Ləğv et'}
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
              {order.customer?.name ?? 'Müştəri'}
            </span>
            <span className="text-sm text-slate-500">Menecer: {order.manager?.fullName ?? '—'}</span>
          </div>

          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <Info label="Son tarix" value={formatDateOnly(order.deadlineAt)} />
            <Info label="Yaradılıb" value={formatDateOnly(order.createdAt)} />
            <Info label="Qeyd" value={order.comment ?? '—'} />
            <Info label="Müştəri borcu" value={formatCurrency(order.customerDebtAmount)} />
          </dl>
        </Card>

        <Card className="border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Satış</div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(order.totalAmount)}</div>
          <div className="mt-1 text-sm text-slate-500">Ödənilib: {formatCurrency(order.paidAmount)}</div>
        </Card>

        <Card className="border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Ümumi xərc</div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(order.costAmount)}</div>
          <div className="mt-1 text-sm text-slate-500">Xeyir: {formatCurrency(order.profitAmount)}</div>
        </Card>

        <Card className="border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Xeyir faizi</div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{formatPercent(order.marginPercent)}</div>
          <div className="mt-1 text-sm text-slate-500">{profitability?.isProfitable ? 'Qazanclıdır' : 'Mənfi marjadadır'}</div>
        </Card>
      </div>

      <Card className="border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Sifariş mövqeləri</h2>
        <div className="mt-4">
          <DataTable
            rowKey={(row) => row.id}
            data={order.items}
            columns={[
              { key: 'name', header: 'Məhsul', render: (row) => row.name },
              { key: 'type', header: 'Növ', render: (row) => row.productType },
              { key: 'size', header: 'Ölçü', render: (row) => `${row.width} × ${row.height}` },
              { key: 'quantity', header: 'Say', render: (row) => row.quantity },
              { key: 'color', header: 'Rəng', render: (row) => row.colorMode },
              { key: 'material', header: 'Material', render: (row) => row.materialId ?? '—' },
              { key: 'price', header: 'Məbləğ', render: (row) => formatCurrency(row.totalPrice) }
            ]}
            emptyState={<EmptyState title="Mövqe yoxdur" description="Bu sifariş üçün hələ məhsul sətri əlavə edilməyib." />}
          />
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Hesablama</h2>
              <p className="mt-1 text-sm text-slate-500">Excel-dəki xərc sətrlərinə uyğun əl ilə düzəliş edilə bilən bölmə.</p>
            </div>
            <Button onClick={() => void saveHesablama()} disabled={actionLoading === 'hesablama'}>
              {actionLoading === 'hesablama' ? 'Saxlanır...' : 'Hesablamanı saxla'}
            </Button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Kateqoriya">
              <Input value={hesablama.category} onChange={(event) => setHesablama((current) => (current ? { ...current, category: event.target.value } : current))} />
            </Field>
            <Field label="Məhsul">
              <Input value={hesablama.productName} onChange={(event) => setHesablama((current) => (current ? { ...current, productName: event.target.value } : current))} />
            </Field>
            <Field label="Say">
              <Input type="number" value={hesablama.quantity} onChange={(event) => setHesablama((current) => (current ? { ...current, quantity: asNumber(event.target.value) } : current))} />
            </Field>
            <Field label="Satış məbləği">
              <Input type="number" value={hesablama.saleAmount} onChange={(event) => setHesablama((current) => (current ? { ...current, saleAmount: asNumber(event.target.value) } : current))} />
            </Field>
            <Field label="Ödəniş">
              <Input type="number" value={hesablama.paymentAmount} onChange={(event) => setHesablama((current) => (current ? { ...current, paymentAmount: asNumber(event.target.value) } : current))} />
            </Field>
            <Field label="Bonus">
              <Input type="number" value={hesablama.bonus} onChange={(event) => setHesablama((current) => (current ? { ...current, bonus: asNumber(event.target.value) } : current))} />
            </Field>
            <Field label="Bonus müştəri">
              <Input type="number" value={hesablama.customerBonus} onChange={(event) => setHesablama((current) => (current ? { ...current, customerBonus: asNumber(event.target.value) } : current))} />
            </Field>
            <div className="md:col-span-2 overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Xərc sətri</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Məbləğ</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['paperCost', 'Kağız'],
                    ['plateCost', 'Forma'],
                    ['printCost', 'Çap'],
                    ['specialCutCost', 'Xüsusi kəsim'],
                    ['knifeCost', 'Bıçaq'],
                    ['manualWorkCost', 'Əl işi'],
                    ['spiralCost', 'Spiral'],
                    ['poniCost', 'Poni'],
                    ['otherCost', 'Digər'],
                    ['laminationCost', 'Laminasiya']
                  ].map(([field, label]) => (
                    <tr key={field} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-700">{label}</td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          className="h-9 rounded-lg px-2"
                          value={hesablama[field as keyof HesablamaForm] as number}
                          onChange={(event) =>
                            setHesablama((current) => (current ? { ...current, [field]: asNumber(event.target.value) } : current))
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Qeyd</label>
              <textarea
                value={hesablama.notes}
                onChange={(event) => setHesablama((current) => (current ? { ...current, notes: event.target.value } : current))}
                className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none"
              />
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Metric label="Satış qiyməti" value={formatCurrency(calculatedPreview?.saleUnitPrice)} />
            <Metric label="Qalıq" value={formatCurrency(calculatedPreview?.remainingDebt)} />
            <Metric label="Son qalıq" value={formatCurrency(calculatedPreview?.finalRemainingDebt)} />
            <Metric label="Ümumi xərc" value={formatCurrency(calculatedPreview?.totalCost)} />
            <Metric label="Xeyir" value={formatCurrency(calculatedPreview?.profit)} />
            <Metric label="Xeyir faiz" value={formatPercent(calculatedPreview?.profitPercent)} />
          </div>
        </Card>

        <Card className="border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">İstehsal və anbar</h2>

          <div className="mt-4 space-y-4">
            <SectionTitle title="İstehsal tapşırıqları" />
            {order.productionJobs.length ? (
              order.productionJobs.map((job) => (
                <div key={job.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-950">{job.number}</div>
                      <div className="text-xs text-slate-500">
                        {job.route?.name ?? 'Marşrut yoxdur'} • {formatDateOnly(job.deadlineAt)}
                      </div>
                    </div>
                    <StatusBadge kind="production" status={job.status} />
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="İstehsal yaradılmayıb" description="Əvvəlcə sifariş təsdiqlənməli və istehsala göndərilməlidir." />
            )}

            <SectionTitle title="Rezervlər" />
            {order.stockReservations.length ? (
              order.stockReservations.map((reservation) => (
                <div key={reservation.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-950">{reservation.material?.name ?? 'Material'}</div>
                      <div className="text-xs text-slate-500">
                        {reservation.quantity} {reservation.material?.unit ?? ''}
                      </div>
                    </div>
                    <StatusBadge kind="reservation" status={reservation.status} />
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="Rezerv yoxdur" description="Material rezervləri istehsal axınında burada görünəcək." />
            )}

            <SectionTitle title="Anbar hərəkətləri" />
            {order.stockMovements.length ? (
              <div className="space-y-2">
                {order.stockMovements.map((movement) => (
                  <div key={movement.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-950">{movement.material?.name ?? movement.type}</div>
                        <div className="text-xs text-slate-500">
                          {movement.quantity} • {movement.warehouse?.name ?? '—'}
                        </div>
                      </div>
                      <StatusBadge kind="movement" status={movement.type} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Hərəkət yoxdur" description="Silmə, qaytarma və rezerv hərəkətləri burada görünəcək." />
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Qaimə və ödənişlər</h2>
          <div className="mt-4 space-y-4">
            <SectionTitle title="Qaimələr" />
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
              <EmptyState title="Qaimə yoxdur" description="Maliyyə hissəsində qaimə yaradıldıqdan sonra burada görünəcək." />
            )}

            <SectionTitle title="Ödənişlər" />
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
                    {formatCurrency(payment.amount)} • {payment.method}
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="Ödəniş yoxdur" description="Sifarişə bağlı ödənişlər burada görünəcək." />
            )}
          </div>
        </Card>

        <Card className="border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Xeyirlilik və tarixçə</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Metric label="Xalis xeyir" value={formatCurrency(order.profitability.netProfit)} />
            <Metric label="Marja" value={formatPercent(order.profitability.marginPercent)} />
            <Metric label="Borclu qalıq" value={formatCurrency(order.profitability.customerDebtAmount)} />
            <Metric label="Status" value={order.profitability.isProfitable ? 'Qazanclı' : 'Riskli'} className="sm:col-span-2" />
          </div>

          <div className="mt-5">
            <SectionTitle title="Dəyişiklik tarixi" />
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
                <EmptyState title="Tarixçə yoxdur" description="Audit qeydləri əməliyyat aparıldıqca burada görünəcək." />
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
        cancelLabel="Bağla"
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}
