import { Card } from '@bestapp/ui';
import { cardClass } from '../styles';

type LoadingStateProps = {
  rows?: number;
  compact?: boolean;
};

export function LoadingState({ rows = 4, compact = false }: LoadingStateProps) {
  return (
    <Card className={`${cardClass} p-5`}>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="animate-pulse rounded-3xl border border-white/20 bg-white/70 p-4 shadow-sm">
            <div className={`h-4 rounded-full bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 ${compact ? 'w-1/2' : 'w-3/4'}`} />
            <div className="mt-3 h-3 w-full rounded-full bg-slate-200/80" />
          </div>
        ))}
      </div>
    </Card>
  );
}
