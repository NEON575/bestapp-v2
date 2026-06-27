import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils/cn';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-white/15 bg-white/85 shadow-[0_18px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl transition-all duration-200',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
