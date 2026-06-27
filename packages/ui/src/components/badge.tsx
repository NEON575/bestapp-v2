import type { HTMLAttributes } from 'react';
import { cn } from '../utils/cn';

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-white/20 bg-white/75 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-md',
        className
      )}
      {...props}
    />
  );
}
