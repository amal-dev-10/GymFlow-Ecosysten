'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from './cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({ open, onClose, title, description, size = 'md', children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative w-full bg-white rounded-[var(--radius-dialog)] shadow-2xl animate-scale-in max-h-[90vh] flex flex-col',
          sizeClasses[size]
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between px-7 pt-7 pb-4 shrink-0">
            <div>
              {title && <h2 className="text-lg font-bold text-neutral-900 tracking-tight">{title}</h2>}
              {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="px-7 pb-2 overflow-y-auto scrollbar-thin flex-1">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-neutral-100 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
