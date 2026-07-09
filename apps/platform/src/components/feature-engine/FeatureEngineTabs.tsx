'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ToggleLeft,
  Gauge,
  MonitorSmartphone,
  ShieldCheck,
  Building2,
  KeySquare,
  AlertTriangle,
  Grid3x3,
  History,
  Code2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const TABS = [
  { name: 'Dashboard', path: '/commercial/feature-engine', icon: LayoutDashboard },
  { name: 'Features', path: '/commercial/feature-engine/features', icon: ToggleLeft },
  { name: 'Limits', path: '/commercial/feature-engine/limits', icon: Gauge },
  { name: 'Workspace Experience', path: '/commercial/feature-engine/workspace-experience', icon: MonitorSmartphone },
  { name: 'Validation Rules', path: '/commercial/feature-engine/validation-rules', icon: ShieldCheck },
  { name: 'Organizations', path: '/commercial/feature-engine/organizations', icon: Building2 },
  { name: 'Overrides', path: '/commercial/feature-engine/overrides', icon: KeySquare },
  { name: 'Violations', path: '/commercial/feature-engine/violations', icon: AlertTriangle },
  { name: 'Matrix', path: '/commercial/feature-engine/matrix', icon: Grid3x3 },
  { name: 'Audit History', path: '/commercial/feature-engine/audit', icon: History },
  { name: 'Developer Preview', path: '/commercial/feature-engine/developer-preview', icon: Code2 },
];

const SCROLL_STEP = 240;

export default function FeatureEngineTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Recompute which arrows should be enabled based on the current scroll position.
  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft < maxScroll - 1);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      window.removeEventListener('resize', updateArrows);
    };
  }, [updateArrows]);

  // Keep the active tab in view when navigating between pages.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    updateArrows();
  }, [pathname, updateArrows]);

  const scrollBy = (direction: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: direction * SCROLL_STEP, behavior: 'smooth' });
  };

  const arrowClass =
    'shrink-0 flex items-center justify-center w-8 h-8 rounded-xl border transition-colors disabled:opacity-30 disabled:cursor-default cursor-pointer';

  return (
    <div className="flex items-center gap-2 mb-5">
      <button
        type="button"
        onClick={() => scrollBy(-1)}
        disabled={!canScrollLeft}
        aria-label="Scroll tabs left"
        className={`${arrowClass} bg-[#0b101d] border-slate-800/80 text-slate-400 hover:border-indigo-500/30 hover:text-indigo-300`}
      >
        <ChevronLeft size={15} />
      </button>

      <div ref={scrollRef} className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1">
        {TABS.map((tab) => {
          const isActive = pathname === tab.path;
          return (
            <button
              key={tab.path}
              data-active={isActive}
              onClick={() => router.push(tab.path)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-colors shrink-0 ${isActive
                ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                : 'text-slate-500 border border-transparent hover:bg-slate-900/60 hover:text-slate-300'
                }`}
            >
              <tab.icon size={13} />
              {tab.name}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => scrollBy(1)}
        disabled={!canScrollRight}
        aria-label="Scroll tabs right"
        className={`${arrowClass} bg-[#0b101d] border-slate-800/80 text-slate-400 hover:border-indigo-500/30 hover:text-indigo-300`}
      >
        <ChevronRight size={15} />
      </button>
    </div>
  );
}
