'use client';

import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from './cn';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ElementType;
  badge?: string | number;
  disabled?: boolean;
}

interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  scrollable?: boolean;
  className?: string;
}

// Shared horizontal underline tab bar — the canonical tab style used across
// the app (matches the Training Studio pattern). Scrolls with chevron
// buttons when there are more tabs than fit the container.
export function Tabs({ tabs, activeId, onChange, scrollable = true, className }: TabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  return (
    <div className={cn('flex items-stretch bg-neutral-50/40 border-b border-neutral-200', className)}>
      {scrollable && (
        <button
          type="button"
          onClick={() => scroll('left')}
          className="shrink-0 flex items-center justify-center w-8 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          aria-label="Scroll tabs left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      <div
        ref={scrollRef}
        className={cn('flex whitespace-nowrap scroll-smooth', scrollable ? 'px-2 overflow-x-auto scrollbar-none' : 'flex-wrap')}
      >
        {tabs.map((tab) => {
          const isActive = activeId === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
                isActive
                  ? 'border-primary text-primary bg-primary-light'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100/60'
              )}
            >
              {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={cn(
                    'text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0',
                    isActive ? 'bg-primary text-white' : 'bg-neutral-200 text-neutral-600'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {scrollable && (
        <button
          type="button"
          onClick={() => scroll('right')}
          className="shrink-0 flex items-center justify-center w-8 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          aria-label="Scroll tabs right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
