'use client';

import { useEffect, useRef, useState } from 'react';
import { Bookmark, ChevronDown, Plus, Trash2, LifeBuoy, TrendingUp, DollarSign, Wrench, Code2 } from 'lucide-react';
import type { OrganizationListFilters } from '@/types/organizations';

const STORAGE_KEY = 'platform_org_saved_views';

interface SavedView {
  id: string;
  name: string;
  filters: OrganizationListFilters;
}

// Team presets map to the filter combinations each team lives in day-to-day.
const PRESETS: { id: string; name: string; icon: typeof LifeBuoy; filters: OrganizationListFilters }[] = [
  { id: 'support', name: 'Support', icon: LifeBuoy, filters: { health: 'WARNING' } },
  { id: 'sales', name: 'Sales', icon: TrendingUp, filters: { trial: 'true' } },
  { id: 'finance', name: 'Finance', icon: DollarSign, filters: { derivedStatus: 'EXPIRED' } },
  { id: 'operations', name: 'Operations', icon: Wrench, filters: { derivedStatus: 'SUSPENDED' } },
  { id: 'engineering', name: 'Engineering', icon: Code2, filters: { enterprise: 'true' } },
];

export default function OrgSavedViews({ filters, onApply }: { filters: OrganizationListFilters; onApply: (f: OrganizationListFilters) => void }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState<SavedView[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCustom(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const persist = (views: SavedView[]) => {
    setCustom(views);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
  };

  const saveCurrent = () => {
    const name = window.prompt('Name this view:');
    if (!name) return;
    const { page, limit, sortBy, sortDir, ...rest } = filters;
    persist([...custom, { id: `custom-${Date.now()}`, name, filters: rest }]);
  };

  const remove = (id: string) => persist(custom.filter((v) => v.id !== id));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-2 bg-[#0b101d] border border-slate-800/80 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-300 transition-colors"
      >
        <Bookmark size={13} />
        Saved Views
        <ChevronDown size={12} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-[#0b101d] border border-slate-800 shadow-2xl z-30 p-1.5 animate-fade-in">
          <p className="px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-600">Team Views</p>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onApply(p.filters);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
            >
              <p.icon size={14} className="text-indigo-400" />
              {p.name}
            </button>
          ))}

          {custom.length > 0 && (
            <>
              <div className="my-1 border-t border-slate-850" />
              <p className="px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-600">My Views</p>
              {custom.map((v) => (
                <div key={v.id} className="flex items-center group">
                  <button
                    onClick={() => {
                      onApply(v.filters);
                      setOpen(false);
                    }}
                    className="flex-1 flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-900 hover:text-white transition-colors truncate"
                  >
                    <Bookmark size={14} className="text-slate-500 shrink-0" />
                    <span className="truncate">{v.name}</span>
                  </button>
                  <button onClick={() => remove(v.id)} className="p-1.5 text-slate-600 hover:text-rose-400 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </>
          )}

          <div className="my-1 border-t border-slate-850" />
          <button
            onClick={saveCurrent}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-indigo-300 hover:bg-indigo-500/10 transition-colors"
          >
            <Plus size={14} />
            Save current filters
          </button>
        </div>
      )}
    </div>
  );
}
