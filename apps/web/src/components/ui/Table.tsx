'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from './cn';

export function TableContainer({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('bg-surface border border-neutral-200/70 rounded-[var(--radius-table)] shadow-[var(--shadow-card)] overflow-hidden', className)}>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function Table({ className, children }: { className?: string; children: React.ReactNode }) {
  return <table className={cn('w-full text-sm border-collapse', className)}>{children}</table>;
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="sticky top-0 z-10 bg-neutral-50 border-b border-neutral-200">
      {children}
    </thead>
  );
}

export function TH({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <th className={cn('text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap', className)}>
      {children}
    </th>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-neutral-100">{children}</tbody>;
}

export function TR({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn('transition-colors hover:bg-neutral-50/80', className)} {...props}>
      {children}
    </tr>
  );
}

export function TD({ className, children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('px-5 py-4 text-sm text-neutral-700 align-middle', className)} {...props}>
      {children}
    </td>
  );
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-t border-neutral-100 bg-neutral-50/50">
      <span className="text-xs text-neutral-500 font-medium">
        {totalItems !== undefined && pageSize !== undefined
          ? `Showing ${Math.min((page - 1) * pageSize + 1, totalItems)}–${Math.min(page * pageSize, totalItems)} of ${totalItems}`
          : `Page ${page} of ${totalPages}`}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-white hover:text-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="px-3 text-xs font-semibold text-neutral-700">{page} / {Math.max(totalPages, 1)}</span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-white hover:text-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
