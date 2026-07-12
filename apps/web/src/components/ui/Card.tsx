'use client';

import React from 'react';
import { cn } from './cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  padded?: boolean;
}

export function Card({ hoverable = false, padded = true, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-surface border border-neutral-200/70 rounded-[var(--radius-card)] shadow-[var(--shadow-card)]',
        padded && 'p-6',
        hoverable && 'transition-all duration-200 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center justify-between mb-5', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-sm font-bold text-neutral-900 tracking-tight', className)} {...props}>
      {children}
    </h3>
  );
}
