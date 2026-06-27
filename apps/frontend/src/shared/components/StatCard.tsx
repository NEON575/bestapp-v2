import type { LucideIcon } from 'lucide-react';
import { Card } from '@bestapp/ui';
import { ArrowUpRight } from 'lucide-react';
import { cardClass } from '../styles';

type StatCardProps = {
  label: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: string;
  accent?: 'slate' | 'emerald' | 'amber' | 'rose' | 'sky';
};

const accentClasses: Record<NonNullable<StatCardProps['accent']>, string> = {
  slate: 'bg-gradient-to-br from-slate-900 to-slate-700 text-white shadow-slate-950/20',
  emerald: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-500/20',
  amber: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-orange-500/20',
  rose: 'bg-gradient-to-br from-rose-500 to-fuchsia-600 text-white shadow-rose-500/20',
  sky: 'bg-gradient-to-br from-cyan-500 to-sky-600 text-white shadow-cyan-500/20'
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
    <Card className={`${cardClass} p-5`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 break-words text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
          {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
          {trend ? <p className="mt-2 text-xs font-medium text-emerald-600">{trend}</p> : null}
        </div>
        <div className={`rounded-2xl p-3 ${accentClasses[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
