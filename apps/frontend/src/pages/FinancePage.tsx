import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import type { CashboxItem, FinanceSummary, InvoiceItem, PaymentItem } from '@bestapp/shared';
import { Button, Card, Input } from '@bestapp/ui';
import { financeClient } from '../shared/api/finance';
import {
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Pagination,
  StatCard,
  StatusBadge
} from '../shared/components';
import { formatCurrency, formatDateOnly } from '../shared/lib/format';

type FinanceAction = 'invoice' | 'payment';

export function FinancePage() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [cashboxes, setCashboxes] = useState<CashboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState<FinanceAction>('payment');
  const [invoicePage, setInvoicePage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const [metaInvoices, setMetaInvoices] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [metaPayments, setMetaPayments] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [invoiceForm, setInvoiceForm] = useState({
    orderId: '',
    number: '',
    totalAmount: 0,
    dueAt: ''
  });
  const [paymentForm, setPaymentForm] = useState({
    orderId: '',
    invoiceId: '',
    cashboxId: '',
    amount: 0,
    method: 'cash',
    reference: '',
    note: ''
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryResponse, invoicesResponse, paymentsResponse, cashboxesResponse] = await Promise.all([
        financeClient.summary(),
        financeClient.invoices({ page: invoicePage, limit: 10 }),
        financeClient.payments({ page: paymentPage, limit: 10 }),
        financeClient.cashboxes()
      ]);

      setSummary(summaryResponse);
      setInvoices(invoicesResponse.data);
      setPayments(paymentsResponse.data);
      setMetaInvoices(invoicesResponse.meta);
      setMetaPayments(paymentsResponse.meta);
      setCashboxes(cashboxesResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить финансы');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoicePage, paymentPage]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (action === 'invoice') {
        await financeClient.createInvoice({
          ...invoiceForm,
          totalAmount: Number(invoiceForm.totalAmount),
          paidAmount: 0
        });
      } else {
        await financeClient.createPayment({
          ...paymentForm,
          amount: Number(paymentForm.amount),
          status: 'completed'
        });
      }

      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить финансовую операцию');
    } finally {
      setSaving(false);
    }
  };

  const reversePayment = async (id: string) => {
    setSaving(true);
    try {
      await financeClient.reversePayment(id);
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (loading && !summary) {
    return (
      <div className="space-y-5">
        <PageHeader title="Finance" description="Счета, оплаты и кассы." />
        <LoadingState rows={4} />
      </div>
    );
  }

  if (error && !summary) {
    return <ErrorState description={error} onRetry={() => void load()} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Finance" description="Контур счетов, оплат, кассы и долгов." />

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Счета" value={String(summary?.totalInvoices ?? 0)} />
        <StatCard label="Неоплаченные" value={String(summary?.unpaidInvoices ?? 0)} accent="amber" />
        <StatCard label="Просроченные" value={String(summary?.overdueInvoices ?? 0)} accent="rose" />
        <StatCard label="Касса" value={formatCurrency(summary?.totalCashboxBalance)} accent="emerald" />
        <StatCard label="Income today" value={formatCurrency(summary?.todayIncome)} accent="sky" />
        <StatCard label="Expense today" value={formatCurrency(summary?.todayExpense)} accent="rose" />
        <StatCard label="Income month" value={formatCurrency(summary?.monthIncome)} accent="emerald" />
        <StatCard label="Expense month" value={formatCurrency(summary?.monthExpense)} accent="amber" />
      </div>

      <Card className="border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Финансовая операция</h2>
            <p className="text-sm text-slate-500">Создание счета или прием оплаты.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={action === 'payment' ? 'primary' : 'secondary'} type="button" onClick={() => setAction('payment')}>
              Оплата
            </Button>
            <Button variant={action === 'invoice' ? 'primary' : 'secondary'} type="button" onClick={() => setAction('invoice')}>
              Счет
            </Button>
          </div>
        </div>

        <form className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={submit}>
          {action === 'invoice' ? (
            <>
              <Field label="Order ID">
                <Input value={invoiceForm.orderId} onChange={(event) => setInvoiceForm((current) => ({ ...current, orderId: event.target.value }))} required />
              </Field>
              <Field label="Номер счета">
                <Input value={invoiceForm.number} onChange={(event) => setInvoiceForm((current) => ({ ...current, number: event.target.value }))} required />
              </Field>
              <Field label="Сумма">
                <Input type="number" value={invoiceForm.totalAmount} onChange={(event) => setInvoiceForm((current) => ({ ...current, totalAmount: Number(event.target.value) }))} required />
              </Field>
              <Field label="Due date">
                <Input type="date" value={invoiceForm.dueAt} onChange={(event) => setInvoiceForm((current) => ({ ...current, dueAt: event.target.value }))} />
              </Field>
            </>
          ) : (
            <>
              <Field label="Order ID">
                <Input value={paymentForm.orderId} onChange={(event) => setPaymentForm((current) => ({ ...current, orderId: event.target.value }))} />
              </Field>
              <Field label="Invoice ID">
                <Input value={paymentForm.invoiceId} onChange={(event) => setPaymentForm((current) => ({ ...current, invoiceId: event.target.value }))} />
              </Field>
              <Field label="Cashbox">
                <select
                  value={paymentForm.cashboxId}
                  onChange={(event) => setPaymentForm((current) => ({ ...current, cashboxId: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="">Без кассы</option>
                  {cashboxes.map((cashbox) => (
                    <option key={cashbox.id} value={cashbox.id}>
                      {cashbox.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Сумма">
                <Input type="number" value={paymentForm.amount} onChange={(event) => setPaymentForm((current) => ({ ...current, amount: Number(event.target.value) }))} required />
              </Field>
              <Field label="Метод">
                <select
                  value={paymentForm.method}
                  onChange={(event) => setPaymentForm((current) => ({ ...current, method: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="cash">cash</option>
                  <option value="card">card</option>
                  <option value="bank_transfer">bank_transfer</option>
                  <option value="other">other</option>
                </select>
              </Field>
              <Field label="Reference">
                <Input value={paymentForm.reference} onChange={(event) => setPaymentForm((current) => ({ ...current, reference: event.target.value }))} />
              </Field>
              <Field label="Note">
                <Input value={paymentForm.note} onChange={(event) => setPaymentForm((current) => ({ ...current, note: event.target.value }))} />
              </Field>
            </>
          )}

          <div className="md:col-span-2 xl:col-span-4 flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? 'Сохраняем...' : action === 'invoice' ? 'Создать счет' : 'Принять оплату'}
            </Button>
          </div>
        </form>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Счета</h2>
          <div className="mt-4">
            <DataTable
              rowKey={(row) => row.id}
              data={invoices}
              columns={[
                { key: 'number', header: 'Номер', render: (row) => row.number },
                { key: 'order', header: 'Заказ', render: (row) => row.order?.number ?? '—' },
                { key: 'status', header: 'Статус', render: (row) => <StatusBadge kind="invoice" status={row.status} /> },
                { key: 'total', header: 'Сумма', render: (row) => formatCurrency(row.totalAmount) },
                { key: 'paid', header: 'Оплачено', render: (row) => formatCurrency(row.paidAmount) },
                { key: 'due', header: 'Срок', render: (row) => formatDateOnly(row.dueAt) }
              ]}
              emptyState={<EmptyState title="Счетов нет" description="Счета появятся после выставления." />}
            />
          </div>
          <Pagination page={metaInvoices.page} totalPages={metaInvoices.totalPages} onPageChange={setInvoicePage} />
        </Card>

        <Card className="border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Оплаты</h2>
          <div className="mt-4 space-y-3">
            {payments.length ? (
              payments.map((payment) => (
                <div key={payment.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-950">{payment.reference ?? payment.id}</div>
                      <div className="text-xs text-slate-500">
                        {formatDateOnly(payment.paidAt)} · {payment.method}
                      </div>
                    </div>
                    <StatusBadge kind="payment" status={payment.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-950">{formatCurrency(payment.amount)}</div>
                    <Button variant="secondary" onClick={() => void reversePayment(payment.id)} disabled={saving}>
                      Reverse
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="Оплат нет" description="Платежи появятся после приема оплаты." />
            )}
          </div>
          <Pagination page={metaPayments.page} totalPages={metaPayments.totalPages} onPageChange={setPaymentPage} />
        </Card>
      </div>
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
