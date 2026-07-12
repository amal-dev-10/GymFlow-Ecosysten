'use client';

import React from 'react';
import { cn } from './cn';

const fieldBase =
  'w-full h-11 px-3.5 rounded-[var(--radius-input)] bg-white border border-neutral-200 text-sm text-neutral-900 placeholder:text-neutral-400 transition-all duration-150 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light disabled:bg-neutral-50 disabled:text-neutral-400';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldBase, className)} {...props} />
  )
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(fieldBase, 'h-auto min-h-[96px] py-2.5 resize-y', className)} {...props} />
  )
);
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(fieldBase, 'appearance-none cursor-pointer pr-8', className)} {...props}>
      {children}
    </select>
  )
);
Select.displayName = 'Select';

export function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn('block text-xs font-semibold text-neutral-700 mb-1.5', className)} {...props}>
      {children}
    </label>
  );
}

export function FormField({ label, hint, error, children }: { label?: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      {label && <Label>{label}</Label>}
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-neutral-500">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-danger font-medium">{error}</p>}
    </div>
  );
}
