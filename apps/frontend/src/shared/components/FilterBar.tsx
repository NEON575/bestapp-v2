import type { ReactNode } from 'react';
import { Card } from '@bestapp/ui';
import { cardClass } from '../styles';

type FilterBarProps = {
  children: ReactNode;
};

export function FilterBar({ children }: FilterBarProps) {
  return (
    <Card className={`${cardClass} p-4`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">{children}</div>
    </Card>
  );
}
