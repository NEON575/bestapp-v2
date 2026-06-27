import type { LucideIcon } from 'lucide-react';
import { Button, Card } from '@bestapp/ui';
import { cardClass } from '../styles';

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
    <Card className={`${cardClass} border-dashed border-white/20 bg-white/75 p-8 text-center`}>
      {Icon ? (
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl border border-cyan-500/15 bg-gradient-to-br from-cyan-500/10 via-violet-500/10 to-orange-500/10 text-cyan-700 shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
      ) : null}
      <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
      {description ? <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p> : null}
      {actionLabel && onAction ? (
        <div className="mt-5">
          <Button onClick={onAction}>{actionLabel}</Button>
        </div>
      ) : null}
    </Card>
  );
}
