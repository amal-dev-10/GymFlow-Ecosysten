'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder } from 'lucide-react';
import type { PermissionTreeCategoryDTO } from '@/types/roles';
import { MatrixCellIcon } from './RoleBadges';
import type { MatrixCellState } from '@/types/roles';

interface Props {
  tree: PermissionTreeCategoryDTO[];
  /** Map of permission key -> effect, used to annotate the tree for a specific role/user evaluation. */
  effectByKey?: Map<string, MatrixCellState>;
}

export default function PermissionTree({ tree, effectByKey }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(tree.map((c) => c.key)));

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="space-y-1">
      {tree.map((cat) => {
        const isOpen = expanded.has(cat.key);
        return (
          <div key={cat.key}>
            <button onClick={() => toggle(cat.key)} className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-900/60 transition-colors text-left">
              {isOpen ? <ChevronDown size={13} className="text-slate-600 shrink-0" /> : <ChevronRight size={13} className="text-slate-600 shrink-0" />}
              <Folder size={13} className="text-indigo-400 shrink-0" />
              <span className="text-xs font-bold text-slate-200">{cat.label}</span>
              <span className="text-[10px] text-slate-600 ml-auto">{cat.permissions.length}</span>
            </button>
            {isOpen && (
              <div className="ml-6 border-l border-slate-900 pl-3 space-y-0.5 py-1">
                {cat.permissions.map((p) => {
                  const state = effectByKey?.get(p.key) ?? 'NONE';
                  return (
                    <div key={p.key} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-900/40">
                      {effectByKey && <MatrixCellIcon state={state} size={12} />}
                      <span className="text-[11px] text-slate-400 font-mono">{p.key}</span>
                      <span className="text-[10px] text-slate-600 ml-auto">{p.action}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
