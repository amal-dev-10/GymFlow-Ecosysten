'use client';

import { useEffect, useState } from 'react';
import { Activity, Boxes, Clock, GitBranch, Server, SlidersHorizontal } from 'lucide-react';
import { platformGlobalSettingsApi } from '@/lib/api';
import type { SettingsDashboardDTO } from '@/types/globalSettings';
import { CATEGORY_LABELS } from '@/types/globalSettings';
import { PLATFORM_VERSION } from '@/app/(app)/layout';

const timeAgo = (iso: string | null) => {
  if (!iso) return 'Never';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

function StatTile({ icon: Icon, label, value, sub }: { icon: typeof Server; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#0b101d] border border-slate-800/80 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between min-h-[100px] transition-colors">
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        <Icon size={12} className="text-indigo-400" /> {label}
      </span>
      <span className="text-lg font-black text-slate-100 mt-2 truncate">{value}</span>
      {sub && <span className="text-[10px] text-slate-600 mt-1">{sub}</span>}
    </div>
  );
}

export default function SettingsDashboard({ onNavigate }: { onNavigate: (category: string) => void }) {
  const [summary, setSummary] = useState<SettingsDashboardDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const environment = process.env.NODE_ENV === 'production' ? 'Production' : 'Development';

  useEffect(() => {
    platformGlobalSettingsApi
      .getDashboard()
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !summary) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-[100px] bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatTile icon={Server} label="Environment" value={environment} />
        <StatTile icon={GitBranch} label="Platform Version" value={PLATFORM_VERSION} />
        <StatTile icon={SlidersHorizontal} label="Settings Customized" value={`${summary.totalCustomized} / ${summary.totalFields}`} sub="fields changed from defaults" />
        <StatTile icon={Clock} label="Last Updated" value={timeAgo(summary.lastUpdatedAt)} sub={summary.lastUpdatedBy ? `by ${summary.lastUpdatedBy}` : undefined} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200 mb-3"><Boxes size={13} className="text-indigo-400" /> Customized by Category</span>
          <div className="space-y-2">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
              const count = summary.customizedByCategory[key] || 0;
              return (
                <button key={key} onClick={() => onNavigate(key)} className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/40 border border-slate-850 hover:border-indigo-500/30 transition-colors text-left">
                  <span className="text-xs font-semibold text-slate-300">{label}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${count > 0 ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' : 'bg-slate-800/60 border-slate-700/60 text-slate-500'}`}>
                    {count} customized
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200 mb-3"><Activity size={13} className="text-indigo-400" /> Recent Changes</span>
          {summary.recentChanges.length === 0 ? (
            <p className="text-[11px] text-slate-600">No settings changes yet.</p>
          ) : (
            <div className="space-y-2">
              {summary.recentChanges.map((c) => (
                <button key={c.id} onClick={() => onNavigate(c.category)} className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/40 border border-slate-850 hover:border-indigo-500/30 transition-colors text-left">
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-slate-200">{c.categoryLabel}</span>
                    <p className="text-[10px] text-slate-600 truncate">{c.changeNote || 'Updated'} {c.changedByName ? `- ${c.changedByName}` : ''}</p>
                  </div>
                  <span className="text-[10px] text-slate-600 shrink-0 ml-2">{timeAgo(c.createdAt)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
