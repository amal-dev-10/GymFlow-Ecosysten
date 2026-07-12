'use client';

import React from 'react';
import { cn } from './cn';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
type Size = 'sm' | 'md';

const toneClasses: Record<Tone, string> = {
  success: 'bg-success-light text-green-700',
  warning: 'bg-warning-light text-amber-700',
  danger: 'bg-danger-light text-red-700',
  info: 'bg-primary-light text-primary',
  neutral: 'bg-neutral-100 text-neutral-600',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-2 py-0.5 text-[9px] gap-1',
  md: 'px-2.5 py-1 text-[11px] gap-1.5',
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  size?: Size;
  dot?: boolean;
}

export function Badge({ tone = 'neutral', size = 'md', dot = false, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold whitespace-nowrap',
        sizeClasses[size],
        toneClasses[tone],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', {
        success: 'bg-green-500',
        warning: 'bg-amber-500',
        danger: 'bg-red-500',
        info: 'bg-primary',
        neutral: 'bg-neutral-400',
      }[tone])} />}
      {children}
    </span>
  );
}
