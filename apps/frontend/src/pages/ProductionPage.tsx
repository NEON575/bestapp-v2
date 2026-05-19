import { useEffect, useState } from 'react';
import type { ProductionBoard, ProductionOperationItem } from '@bestapp/shared';
import { productionClient } from '../shared/api/production';
import { Card } from '@bestapp/ui';
import { ErrorState, EmptyState, LoadingState, PageHeader, StatusBadge } from '../shared/components';
import { formatDateOnly } from '../shared/lib/format';

const columns: Array<{ key: keyof ProductionBoard; title: string }> = [
  { key: 'pending', title: 'Pending' },
  { key: 'ready', title: 'Ready' },
  { key: 'in_progress', title: 'In progress' },
  { key: 'paused', title: 'Paused' },
  { key: 'completed', title: 'Completed' },
  { key: 'failed', title: 'Failed' }
];

export function ProductionPage() {
  const [board, setBoard] = useState<ProductionBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productionClient.board();
      setBoard(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить production board');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading && !board) {
    return (
      <div className="space-y-5">
        <PageHeader title="Production" description="Kanban-board производственных операций." />
        <LoadingState rows={4} />
      </div>
    );
  }

  if (error) {
    return <ErrorState description={error} onRetry={() => void load()} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Production"
        description="Операции типографии по статусам: от подготовки до завершения."
      />

      <div className="grid gap-4 xl:grid-cols-6">
        {columns.map((column) => {
          const items = board?.[column.key] ?? [];
          return (
            <Card key={column.key} className="border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{column.title}</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{items.length}</span>
              </div>

              <div className="mt-4 space-y-3">
                {items.length ? (
                  items.map((item) => <OperationCard key={item.id} item={item} />)
                ) : (
                  <EmptyState title="Пусто" description="Нет операций в этом статусе." />
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function OperationCard({ item }: { item: ProductionOperationItem }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-semibold text-slate-950">{item.productionJob?.order?.number ?? item.name}</div>
          <div className="mt-1 text-xs text-slate-500">
            {item.workCenter?.name ?? 'Участок не задан'} · {item.machine?.name ?? 'Машина не задана'}
          </div>
        </div>
        <StatusBadge kind="production" status={item.status} />
      </div>

      <div className="mt-3 space-y-1 text-xs text-slate-500">
        <div>Операция: {item.name}</div>
        <div>Дедлайн: {formatDateOnly(item.productionJob?.deadlineAt)}</div>
        <div>Порядок: #{item.sequenceNo}</div>
      </div>
    </div>
  );
}

