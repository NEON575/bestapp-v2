import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Card } from '@bestapp/ui';
import { cardClass } from '../styles';

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  widthClassName?: string;
};

export function Modal({ open, title, description, children, onClose, widthClassName = 'max-w-2xl' }: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 px-4 py-6 backdrop-blur-xl">
      <Card className={`${cardClass} relative flex w-full ${widthClassName} max-h-[90vh] flex-col overflow-hidden p-0`}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.14),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(168,85,247,0.12),_transparent_26%)]" />
        <div className="relative flex items-start justify-between gap-4 border-b border-white/15 px-6 py-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
            {description ? <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/20 bg-white/70 p-2 text-slate-500 transition hover:bg-white hover:text-slate-900"
            aria-label="Bağla"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="relative flex-1 overflow-y-auto px-6 py-6">{children}</div>
      </Card>
    </div>
  );
}
