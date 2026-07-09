'use client';

import React from 'react';
import { GripVertical, EyeOff, Star } from 'lucide-react';

interface WidgetShellProps {
  id: string;
  title: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  actions?: React.ReactNode;
  children: React.ReactNode;
  draggable?: boolean;
  favorite?: boolean;
  onHide?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onDragStart?: (id: string) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (id: string) => void;
  className?: string;
}

/**
 * Consistent card chrome for every dashboard widget: title row with an
 * optional icon, a drag handle + hide/favorite controls for the
 * personalization layer, and a content slot. Every section of the
 * dashboard is built as one or more of these.
 */
export default function WidgetShell({
  id,
  title,
  icon: Icon,
  actions,
  children,
  draggable = false,
  favorite = false,
  onHide,
  onToggleFavorite,
  onDragStart,
  onDragOver,
  onDrop,
  className = '',
}: WidgetShellProps) {
  return (
    <div
      draggable={draggable}
      onDragStart={() => onDragStart?.(id)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver?.(e);
      }}
      onDrop={() => onDrop?.(id)}
      className={`bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-hidden flex flex-col ${draggable ? 'cursor-grab active:cursor-grabbing' : ''} ${className}`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-850/80 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {draggable && <GripVertical size={13} className="text-slate-700 shrink-0" />}
          {Icon && <Icon size={14} className="text-indigo-400 shrink-0" />}
          <h3 className="text-xs font-bold text-slate-200 truncate">{title}</h3>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {actions}
          {onToggleFavorite && (
            <button
              onClick={() => onToggleFavorite(id)}
              title="Favorite widget"
              className={`p-1 rounded-lg transition-colors ${favorite ? 'text-amber-400' : 'text-slate-700 hover:text-slate-400'}`}
            >
              <Star size={12} fill={favorite ? 'currentColor' : 'none'} />
            </button>
          )}
          {onHide && (
            <button
              onClick={() => onHide(id)}
              title="Hide widget"
              className="p-1 rounded-lg text-slate-700 hover:text-slate-400 transition-colors"
            >
              <EyeOff size={12} />
            </button>
          )}
        </div>
      </div>
      <div className="p-4 flex-1">{children}</div>
    </div>
  );
}
