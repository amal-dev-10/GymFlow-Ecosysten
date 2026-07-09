'use client';

import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { platformPermissionsApi } from '@/lib/api';
import type { PermissionCategoryDTO, PermissionDTO } from '@/types/roles';
import { SensitiveBadge } from './RoleBadges';

/**
 * Spec: "Permission Search - Search Permission, Role, Category, Module."
 * Free-text query matches permission key/label/resource; category filter
 * narrows by module. Role usage isn't shown per-result here (see the
 * Permission Matrix / Role Details tabs for role-level breakdowns) - this
 * is the fast lookup entry point into the catalog.
 */
export default function PermissionSearch() {
  const [categories, setCategories] = useState<PermissionCategoryDTO[]>([]);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [categoryKey, setCategoryKey] = useState('');
  const [results, setResults] = useState<PermissionDTO[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    platformPermissionsApi.listCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!debounced && !categoryKey) {
      setResults([]);
      setOpen(false);
      return;
    }
    platformPermissionsApi.search({ search: debounced || undefined, categoryKey: categoryKey || undefined }).then((res) => {
      setResults(res);
      setOpen(true);
    });
  }, [debounced, categoryKey]);

  return (
    <div className="relative">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search permissions by key, label, or module..."
            className="w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none transition-colors"
          />
          {query && (
            <button onClick={() => { setQuery(''); setOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300">
              <X size={13} />
            </button>
          )}
        </div>
        <select value={categoryKey} onChange={(e) => setCategoryKey(e.target.value)} className="bg-[#0b101d] border border-slate-800/80 hover:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none cursor-pointer">
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </div>

      {open && (
        <div className="mt-2 bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-hidden">
          <div className="max-h-72 overflow-y-auto scrollbar-thin p-2">
            {results.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No permissions match.</p>
            ) : (
              results.map((p) => (
                <div key={p.key} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl hover:bg-slate-900/60">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-200">{p.label}</span>
                      {p.isSensitive && <SensitiveBadge />}
                    </div>
                    <span className="text-[10px] text-slate-600 font-mono">{p.key}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full shrink-0">{p.category}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
