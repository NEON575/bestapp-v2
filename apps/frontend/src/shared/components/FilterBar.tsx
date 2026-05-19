import type { ReactNode } from 'react';
import { Card } from '@bestapp/ui';

type FilterBarProps = {
  children: ReactNode;
};

export function FilterBar({ children }: FilterBarProps) {
  return (
    <Card className="border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">{children}</div>
    </Card>
  );
}

