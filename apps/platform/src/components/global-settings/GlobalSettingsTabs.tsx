'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard,
  Settings2,
  Palette,
  Globe2,
  KeyRound,
  ShieldAlert,
  Bell,
  Database,
  Mail,
  Smartphone,
  Server,
  Workflow,
  ScrollText,
  History,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// Same sticky-scrollable ?section=-driven tab-strip pattern as
// AuditCenterTabs.tsx / RevenueCenterTabs.tsx - copied structurally so this
// module looks and behaves identically to every sibling module.
export const SETTINGS_TABS = [
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
  { id: 'general', name: 'General', icon: Settings2 },
  { id: 'branding', name: 'Branding', icon: Palette },
  { id: 'localization', name: 'Localization', icon: Globe2 },
  { id: 'authentication', name: 'Authentication', icon: KeyRound },
  { id: 'security', name: 'Security', icon: ShieldAlert },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'storage', name: 'Storage', icon: Database },
  { id: 'email', name: 'Email', icon: Mail },
  { id: 'mobile_apps', name: 'Mobile Apps', icon: Smartphone },
  { id: 'system', name: 'System', icon: Server },
  { id: 'automation', name: 'Automation', icon: Workflow },
  { id: 'audit', name: 'Audit History', icon: ScrollText },
  { id: 'versions', name: 'Version History', icon: History },
] as const;

export type SettingsTabId = (typeof SETTINGS_TABS)[number]['id'];

const SCROLL_STEP = 240;

export default function GlobalSettingsTabs({ active, onChange }: { active: SettingsTabId; onChange: (id: SettingsTabId) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const activeEl = el.querySelector<HTMLElement>('[data-active="true"]');
    activeEl?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    updateArrows();
  }, [active, updateArrows]);

  const scrollBy = (dir: -1 | 1) => scrollRef.current?.scrollBy({ left: dir * SCROLL_STEP, behavior: 'smooth' });
  const arrowClass = 'shrink-0 flex items-center justify-center w-8 h-8 rounded-xl border transition-colors disabled:opacity-30 disabled:cursor-default cursor-pointer bg-[#0b101d] border-slate-800/80 text-slate-400 hover:border-indigo-500/30 hover:text-indigo-300';

  return (
    <div className="flex items-center gap-2 sticky top-0 z-10 bg-[#07090e]/95 backdrop-blur-md py-2 -mx-1 px-1">
      <button type="button" onClick={() => scrollBy(-1)} disabled={!canScrollLeft} aria-label="Scroll tabs left" className={arrowClass}>
        <ChevronLeft size={15} />
      </button>
      <div ref={scrollRef} className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1">
        {SETTINGS_TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              data-active={isActive}
              onClick={() => onChange(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-colors shrink-0 ${
                isActive ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' : 'text-slate-500 border border-transparent hover:bg-slate-900/60 hover:text-slate-300'
              }`}
            >
              <tab.icon size={13} />
              {tab.name}
            </button>
          );
        })}
      </div>
      <button type="button" onClick={() => scrollBy(1)} disabled={!canScrollRight} aria-label="Scroll tabs right" className={arrowClass}>
        <ChevronRight size={15} />
      </button>
    </div>
  );
}
