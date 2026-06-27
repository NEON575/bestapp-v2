import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils/cn';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: ReactNode;
};

export function Button({
  className,
  variant = 'primary',
  children,
  ...props
}: ButtonProps) {
  const variants: Record<string, string> = {
    primary:
      'bg-gradient-to-r from-cyan-500 via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/25 hover:-translate-y-0.5 hover:shadow-violet-500/35 active:translate-y-0 active:scale-[0.99]',
    secondary:
      'border border-white/20 bg-white/70 text-slate-800 shadow-sm backdrop-blur-md hover:-translate-y-0.5 hover:bg-white hover:shadow-md active:translate-y-0',
    ghost: 'bg-transparent text-slate-700 hover:bg-white/70 hover:text-slate-950 active:scale-[0.99]'
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
