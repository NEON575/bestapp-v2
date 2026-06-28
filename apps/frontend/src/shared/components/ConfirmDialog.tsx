import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button, Card } from '@bestapp/ui';
import { cardClass } from '../styles';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
  loading?: boolean;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Təsdiqlə',
  cancelLabel = 'Ləğv et',
  onConfirm,
  onCancel,
  children,
  loading
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-slate-950/70 px-4 py-6 backdrop-blur-xl sm:py-8">
      <Card className={`${cardClass} mt-0 w-full max-w-lg overflow-hidden p-0 sm:mt-auto sm:mb-auto`}>
        <div className="flex items-start justify-between gap-4 border-b border-white/15 bg-white/90 px-5 py-4 backdrop-blur-xl">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
            {description ? <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-white/20 bg-white/70 p-2 text-slate-500 transition hover:bg-white hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(100dvh-180px)] overflow-y-auto px-5 py-4">
          {children ? <div>{children}</div> : null}
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-white/15 bg-white/90 px-5 py-4 backdrop-blur-xl">
          <Button type="button" variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button type="button" onClick={onConfirm} disabled={loading}>
            {loading ? 'Yadda saxlanır...' : confirmLabel}
          </Button>
        </div>
      </Card>
    </div>
  );
}
