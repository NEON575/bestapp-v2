import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils/cn';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-3xl border border-slate-200/90 bg-white shadow-sm', className)}
      {...props}
    >
      {children}
    </div>
  );
}
