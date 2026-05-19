import { useEffect, useState } from 'react';
import type { DebtItem } from '@bestapp/shared';
import { debtsClient } from '../shared/api/debts';
import { Card } from '@bestapp/ui';
import { DataTable, EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from '../shared/components';
import { formatCurrency, formatDateOnly } from '../shared/lib/format';

export function DebtsPage() {
  const [receivables, setReceivables] = useState<DebtItem[]>([]);
  const [payables, setPayables] = useState<DebtItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [receivablesResponse, payablesResponse] = await Promise.all([
        debtsClient.receivables({ page: 1, limit: 10 }),
        debtsClient.payables({ page: 1, limit: 10 })
      ]);
      setReceivables(receivablesResponse.data);
      setPayables(payablesResponse.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить долги');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader title="Debts" description="Дебиторка и кредиторка." />
        <LoadingState rows={3} />
      </div>
    );
  }

  if (error) {
    return <ErrorState description={error} onRetry={() => void load()} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Debts" description="Кто должен нам и кому должны мы." />

      <div className="grid gap-5 xl:grid-cols-2">
        <DebtTable title="Дебиторка" data={receivables} />
        <DebtTable title="Кредиторка" data={payables} isPayable />
      </div>
    </div>
  );
}

function DebtTable({ title, data, isPayable }: { title: string; data: DebtItem[]; isPayable?: boolean }) {
  return (
    <Card className="border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <div className="mt-4">
        <DataTable
          rowKey={(row) => row.id}
          data={data}
          columns={[
            {
              key: 'counterparty',
              header: isPayable ? 'Поставщик' : 'Клиент',
              render: (row) => row.customer?.name ?? row.order?.customer?.name ?? row.invoice?.order?.customer?.name ?? '—'
            },
            { key: 'amount', header: 'Сумма', render: (row) => formatCurrency(row.amount) },
            { key: 'paid', header: 'Оплачено', render: (row) => formatCurrency(row.paidAmount) },
            {
              key: 'balance',
              header: 'Остаток',
              render: (row) => formatCurrency(Math.max((row.amount ?? 0) - (row.paidAmount ?? 0), 0))
            },
            { key: 'due', header: 'Срок', render: (row) => formatDateOnly(row.dueAt) },
            {
              key: 'status',
              header: 'Статус',
              render: (row) => <StatusBadge kind="custom" status={row.status} />
            }
          ]}
          emptyState={<EmptyState title="Нет данных" description="Список пуст." />}
        />
      </div>
    </Card>
  );
}

