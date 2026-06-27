import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { Card } from '@bestapp/ui';
import { cardClass } from '../styles';

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: ReactNode;
};

export function PageHeader({ title, description, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <Card className={`${cardClass} relative overflow-hidden p-6`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.16),_transparent_26%),radial-gradient(circle_at_bottom_left,_rgba(168,85,247,0.14),_transparent_28%)]" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          {breadcrumbs ? <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{breadcrumbs}</div> : null}
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/15 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-700">
            <Sparkles className="h-3.5 w-3.5" />
            Premium ERP
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">{title}</h1>
          {description ? <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </Card>
  );
}
