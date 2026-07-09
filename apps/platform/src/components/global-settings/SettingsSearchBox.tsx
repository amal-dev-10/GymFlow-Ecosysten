'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { FIELD_LABELS } from '@/lib/globalSettingsFieldLabels';
import { CATEGORY_LABELS, type SettingsCategory } from '@/types/globalSettings';

interface Match {
  category: SettingsCategory;
  categoryLabel: string;
  fieldLabel: string;
}

const ALL_FIELDS: Match[] = Object.entries(FIELD_LABELS).flatMap(([category, fields]) =>
  Object.values(fields).map((fieldLabel) => ({ category: category as SettingsCategory, categoryLabel: CATEGORY_LABELS[category as SettingsCategory], fieldLabel })),
);

export default function SettingsSearchBox({ onSelect }: { onSelect: (category: SettingsCategory) => void }) {
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return ALL_FIELDS.filter((m) => m.fieldLabel.toLowerCase().includes(q) || m.categoryLabel.toLowerCase().includes(q)).slice(0, 8);
  }, [query]);

  return (
    <div className="relative w-full sm:w-72">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search settings..."
        className="w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none"
      />
      {matches.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 rounded-xl bg-[#0b101d] border border-slate-800 shadow-2xl z-30 max-h-64 overflow-y-auto scrollbar-thin">
          {matches.map((m, i) => (
            <button
              key={i}
              onClick={() => {
                onSelect(m.category);
                setQuery('');
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-900 transition-colors"
            >
              <span className="text-xs text-slate-200">{m.fieldLabel}</span>
              <span className="text-[10px] text-slate-600">{m.categoryLabel}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
