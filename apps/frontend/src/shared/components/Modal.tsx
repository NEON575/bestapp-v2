import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Card } from '@bestapp/ui';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
      <Card className={`w-full ${widthClassName} max-h-[90vh] overflow-y-auto border-slate-200 bg-white p-5 shadow-2xl`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
            {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100" aria-label="Закрыть">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </Card>
    </div>
  );
}

