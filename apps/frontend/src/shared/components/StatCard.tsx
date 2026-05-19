import type { LucideIcon } from 'lucide-react';
import { Card } from '@bestapp/ui';
import { ArrowUpRight } from 'lucide-react';

type StatCardProps = {
  label: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: string;
  accent?: 'slate' | 'emerald' | 'amber' | 'rose' | 'sky';
};

const accentClasses: Record<NonNullable<StatCardProps['accent']>, string> = {
  slate: 'bg-slate-900 text-white',
  emerald: 'bg-emerald-600 text-white',
  amber: 'bg-amber-500 text-white',
  rose: 'bg-rose-500 text-white',
  sky: 'bg-sky-600 text-white'
};

export function StatCard({
  label,
  value,
  subtitle,
  icon: Icon = ArrowUpRight,
  trend,
  accent = 'slate'
}: StatCardProps) {
  return (
    <Card className="border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 break-words text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          {trend ? <p className="mt-2 text-xs font-medium text-emerald-600">{trend}</p> : null}
        </div>
        <div className={`rounded-2xl p-3 ${accentClasses[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

