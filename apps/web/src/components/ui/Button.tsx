'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-hover shadow-sm hover:shadow-[0_12px_40px_rgba(37,99,235,0.18)] hover:-translate-y-0.5 disabled:hover:translate-y-0',
  secondary:
    'bg-white text-neutral-700 border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50',
  ghost:
    'bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
  danger:
    'bg-danger text-white hover:bg-red-600 shadow-sm hover:shadow-[0_12px_40px_rgba(239,68,68,0.18)] hover:-translate-y-0.5 disabled:hover:translate-y-0',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-xs gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-6 text-sm gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-[var(--radius-btn)] font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-light',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}
