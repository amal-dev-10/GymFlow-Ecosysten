'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { platformSupportApi } from '@/lib/api';
import type { KbArticleDTO } from '@/types/support';
import { TICKET_CATEGORIES } from './TicketFiltersPanel';

const TYPES = ['Article', 'FAQ', 'Troubleshooting', 'Internal'];
const inputClass = 'w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none';
const selectClass = inputClass + ' cursor-pointer';

export default function ArticleEditorModal({ article, onClose, onSaved }: { article: KbArticleDTO | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(article?.title || '');
  const [category, setCategory] = useState(article?.category || TICKET_CATEGORIES[0]);
  const [type, setType] = useState<string>(article?.type || 'Article');
  const [body, setBody] = useState(article?.body || '');
  const [tags, setTags] = useState(article?.tags.join(', ') || '');
  const [isPublished, setIsPublished] = useState(article?.isPublished ?? true);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim() || !body.trim()) return;
    setBusy(true);
    try {
      const payload = { title, category, type, body, tags: tags.split(',').map((t) => t.trim()).filter(Boolean), isPublished };
      if (article) await platformSupportApi.updateKbArticle(article.id, payload);
      else await platformSupportApi.createKbArticle(payload as any);
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="w-full max-w-lg bg-[#0b101d] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10 max-h-[88vh] overflow-y-auto scrollbar-thin">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-black text-white">{article ? 'Edit Article' : 'New Knowledge Base Article'}</span>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className={inputClass} />
          <div className="grid grid-cols-2 gap-3">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
              {TICKET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={type} onChange={(e) => setType(e.target.value)} className={selectClass}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} placeholder="Article content..." className={inputClass} />
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags (comma-separated)" className={inputClass} />
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="accent-indigo-500" /> Published
          </label>
        </div>
        <button disabled={busy || !title.trim() || !body.trim()} onClick={submit} className="w-full mt-5 flex items-center justify-center gap-1.5 py-2.5 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40">
          {busy && <Loader2 size={13} className="animate-spin" />} Save Article
        </button>
      </div>
    </div>
  );
}
