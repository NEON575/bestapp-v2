import { Card } from '@bestapp/ui';

type LoadingStateProps = {
  rows?: number;
  compact?: boolean;
};

export function LoadingState({ rows = 4, compact = false }: LoadingStateProps) {
  return (
    <Card className="border-slate-200 bg-white p-5 shadow-sm">
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="animate-pulse rounded-2xl bg-slate-100 p-4">
            <div className={`h-4 rounded bg-slate-200 ${compact ? 'w-1/2' : 'w-3/4'}`} />
            <div className="mt-3 h-3 w-full rounded bg-slate-200" />
          </div>
        ))}
      </div>
    </Card>
  );
}

