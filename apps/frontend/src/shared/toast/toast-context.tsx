import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

type ToastTone = 'success' | 'info' | 'warning' | 'danger';

type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  timeoutMs?: number;
};

type ToastItem = ToastInput & {
  id: string;
};

type ToastContextValue = {
  pushToast: (input: ToastInput) => void;
  success: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (input: ToastInput) => {
      const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
      const toast: ToastItem = {
        id,
        tone: input.tone ?? 'info',
        timeoutMs: input.timeoutMs ?? 3500,
        ...input
      };

      setToasts((current) => [toast, ...current].slice(0, 4));
      window.setTimeout(() => removeToast(id), toast.timeoutMs);
    },
    [removeToast]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      pushToast,
      success: (title, description) => pushToast({ title, description, tone: 'success' }),
      info: (title, description) => pushToast({ title, description, tone: 'info' }),
      warning: (title, description) => pushToast({ title, description, tone: 'warning' }),
      error: (title, description) => pushToast({ title, description, tone: 'danger' })
    }),
    [pushToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[min(100vw-2rem,24rem)] flex-col gap-3">
        {toasts.map((toast) => {
          const toneClasses = {
            success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
            info: 'border-sky-200 bg-sky-50 text-sky-900',
            warning: 'border-amber-200 bg-amber-50 text-amber-900',
            danger: 'border-rose-200 bg-rose-50 text-rose-900'
          }[toast.tone ?? 'info'];
          const Icon =
            toast.tone === 'success'
              ? CheckCircle2
              : toast.tone === 'warning'
                ? TriangleAlert
                : toast.tone === 'danger'
                  ? TriangleAlert
                  : Info;

          return (
            <div key={toast.id} className={`pointer-events-auto rounded-2xl border p-4 shadow-xl ${toneClasses}`}>
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{toast.title}</div>
                  {toast.description ? <div className="mt-1 text-sm leading-6 opacity-80">{toast.description}</div> : null}
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="rounded-lg p-1 transition hover:bg-black/5"
                  aria-label="Закрыть уведомление"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return context;
}
