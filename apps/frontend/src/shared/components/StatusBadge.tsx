import { Badge } from '@bestapp/ui';
import {
  getToneForInvoiceStatus,
  getToneForMovementType,
  getToneForOrderStatus,
  getToneForPaymentStatus,
  getToneForProductionStatus,
  toneClass
} from '../lib/status';

type StatusBadgeProps = {
  status?: string | null;
  kind?: 'order' | 'invoice' | 'payment' | 'production' | 'movement' | 'custom';
  label?: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'muted';
};

export function StatusBadge({ status, kind = 'custom', label, tone }: StatusBadgeProps) {
  const resolvedTone =
    tone ??
    (kind === 'order'
      ? getToneForOrderStatus(status)
      : kind === 'invoice'
        ? getToneForInvoiceStatus(status)
        : kind === 'payment'
          ? getToneForPaymentStatus(status)
          : kind === 'production'
            ? getToneForProductionStatus(status)
            : kind === 'movement'
              ? getToneForMovementType(status)
              : 'neutral');

  return (
    <Badge
      className={`border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.15em] ${toneClass(
        resolvedTone
      )}`}
    >
      {label ?? status ?? '—'}
    </Badge>
  );
}

