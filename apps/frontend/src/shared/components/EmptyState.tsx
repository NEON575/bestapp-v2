import type { LucideIcon } from 'lucide-react';
import { Button, Card } from '@bestapp/ui';

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  title,
  description,
  icon: Icon,
  actionLabel,
  onAction
}: EmptyStateProps) {
  return (
    <Card className="border-dashed border-slate-200 bg-slate-50/70 p-8 text-center">
      {Icon ? (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
      ) : null}
      <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
      {description ? <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p> : null}
      {actionLabel && onAction ? (
        <div className="mt-5">
          <Button onClick={onAction}>{actionLabel}</Button>
        </div>
      ) : null}
    </Card>
  );
}
