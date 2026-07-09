'use client';

import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Search, Plus, Eye, Tag } from 'lucide-react';
import { platformSupportApi } from '@/lib/api';
import type { KbArticleDTO } from '@/types/support';
import { TICKET_CATEGORIES } from './TicketFiltersPanel';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';
import ArticleEditorModal from './ArticleEditorModal';

const TYPES = ['Article', 'FAQ', 'Troubleshooting', 'Internal'] as const;
const TYPE_TONE: Record<string, string> = {
  Article: 'text-sky-300 bg-sky-500/10 border-sky-500/20',
  FAQ: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  Troubleshooting: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
  Internal: 'text-violet-300 bg-violet-500/10 border-violet-500/20',
};

export default function KnowledgeBase({ canManage, showToast }: { canManage: boolean; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('');
  const [rows, setRows] = useState<KbArticleDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<KbArticleDTO | null | 'new'>(null);

  const load = useCallback(() => {
    setLoading(true);
    platformSupportApi.listKbArticles({ search: search || undefined, category: category || undefined, type: type || undefined }).then(setRows).catch(() => setRows([])).finally(() => setLoading(false));
  }, [search, category, type]);

  useEffect(() => {
    const timeout = setTimeout(load, 200);
    return () => clearTimeout(timeout);
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search articles, FAQs, guides..." className="w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none" />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-[#0b101d] border border-slate-800/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none cursor-pointer">
          <option value="">All Categories</option>
          {TICKET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} className="bg-[#0b101d] border border-slate-800/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none cursor-pointer">
          <option value="">All Types</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {canManage && (
          <button onClick={() => setEditing('new')} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 rounded-xl text-xs font-bold text-indigo-300 transition-colors">
            <Plus size={13} /> New Article
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{[...Array(6)].map((_, i) => <div key={i} className="h-32 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <PlatformEmptyState icon={BookOpen} title="No articles found" description="Try a different search or category, or publish a new article." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((a) => (
            <div key={a.id} className="bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 rounded-2xl p-4 transition-colors cursor-pointer" onClick={() => setExpanded(expanded === a.id ? null : a.id)}>
              <div className="flex items-start justify-between gap-2">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${TYPE_TONE[a.type]}`}>{a.type}</span>
                {canManage && (
                  <button onClick={(e) => { e.stopPropagation(); setEditing(a); }} className="text-[10px] font-bold text-slate-500 hover:text-indigo-300">Edit</button>
                )}
              </div>
              <h3 className="text-xs font-bold text-slate-100 mt-2">{a.title}</h3>
              <p className={`text-[11px] text-slate-500 mt-1.5 ${expanded === a.id ? '' : 'line-clamp-3'}`}>{a.body}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-900/60 text-[10px] text-slate-600">
                <span className="flex items-center gap-1"><Tag size={10} /> {a.category}</span>
                <span className="flex items-center gap-1"><Eye size={10} /> {a.viewCount}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ArticleEditorModal
          article={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); showToast('Knowledge base article saved.'); }}
        />
      )}
    </div>
  );
}
