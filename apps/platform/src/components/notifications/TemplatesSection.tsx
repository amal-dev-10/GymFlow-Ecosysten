'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, Plus, FileText, Archive } from 'lucide-react';
import { platformNotificationsApi } from '@/lib/api';
import type { NotificationTemplateDTO } from '@/types/notifications';
import { TEMPLATE_CATEGORIES } from '@/types/notifications';
import { ChannelBadge } from './NotificationBadges';
import TemplateEditorModal from './TemplateEditorModal';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

const STATUS_STYLES: Record<string, string> = {
  Draft: 'bg-slate-800/60 border-slate-700/60 text-slate-400',
  Active: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
  Archived: 'bg-slate-800/60 border-slate-700/60 text-slate-500',
};

export default function TemplatesSection({ canManage, showToast }: { canManage: boolean; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [rows, setRows] = useState<NotificationTemplateDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<NotificationTemplateDTO | null | undefined>(undefined);

  const load = useCallback(() => {
    setLoading(true);
    platformNotificationsApi
      .listTemplates({ search: search || undefined, category: category || undefined })
      .then(setRows)
      .catch(() => showToast('Failed to load templates.', 'error'))
      .finally(() => setLoading(false));
  }, [search, category, showToast]);

  useEffect(() => {
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
  }, [load]);

  const archive = async (id: string) => {
    try {
      await platformNotificationsApi.archiveTemplate(id);
      showToast('Template archived.');
      load();
    } catch {
      showToast('Failed to archive template.', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search templates..." className="w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none" />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-[#0b101d] border border-slate-800/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none cursor-pointer">
          <option value="">All Categories</option>
          {TEMPLATE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {canManage && (
          <button onClick={() => setEditing(null)} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 rounded-xl text-xs font-bold text-indigo-300 transition-colors">
            <Plus size={13} /> New Template
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <PlatformEmptyState icon={FileText} title="No templates found" description="Create a template to reuse across campaigns and quick sends." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((t) => (
            <div key={t.id} onClick={() => setEditing(t)} className="bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 rounded-2xl p-4 cursor-pointer transition-colors space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 truncate">{t.title}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ml-2 ${STATUS_STYLES[t.status] || STATUS_STYLES.Draft}`}>{t.status}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500">{t.category}</span>
                <ChannelBadge channel={t.channel} />
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-2">{t.body}</p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-600">{t.variables.length} variable(s)</span>
                {canManage && t.status !== 'Archived' && (
                  <button onClick={(e) => { e.stopPropagation(); archive(t.id); }} className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-rose-400">
                    <Archive size={11} /> Archive
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing !== undefined && (
        <TemplateEditorModal
          template={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => { setEditing(undefined); showToast(editing ? 'Template updated.' : 'Template created.'); load(); }}
        />
      )}
    </div>
  );
}
