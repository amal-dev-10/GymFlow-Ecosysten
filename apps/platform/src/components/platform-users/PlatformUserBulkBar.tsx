'use client';

import { useState } from 'react';
import { PlayCircle, Ban, Building2, Crown, Download, Trash2, X } from 'lucide-react';
import type { PlatformDepartmentDTO } from '@/types/platformUsers';
import { ROLE_OPTIONS } from './PlatformUserBadges';

interface Props {
  count: number;
  canManage: boolean;
  departments: PlatformDepartmentDTO[];
  onClear: () => void;
  onBulk: (action: 'activate' | 'suspend' | 'assign_department' | 'assign_role' | 'delete', extra?: { department?: string; role?: string }) => void;
  onExport: () => void;
  busy: boolean;
}

export default function PlatformUserBulkBar({ count, canManage, departments, onClear, onBulk, onExport, busy }: Props) {
  const [deptOpen, setDeptOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);

  const btn = 'flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold border transition-colors disabled:opacity-40';

  return (
    <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 bg-[#0b101d]/95 backdrop-blur-md border border-indigo-500/20 rounded-2xl p-3 shadow-2xl">
      <span className="flex items-center gap-2 text-xs font-bold text-indigo-300 pl-1">
        <span className="w-6 h-6 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-[10px]">{count}</span>
        selected
      </span>
      <div className="h-5 w-px bg-slate-800 mx-1" />

      {canManage && (
        <>
          <button disabled={busy} onClick={() => onBulk('activate')} className={`${btn} bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/15`}>
            <PlayCircle size={13} /> Activate
          </button>
          <button disabled={busy} onClick={() => onBulk('suspend')} className={`${btn} bg-rose-500/10 border-rose-500/20 text-rose-300 hover:bg-rose-500/15`}>
            <Ban size={13} /> Suspend
          </button>

          <div className="relative">
            <button disabled={busy} onClick={() => setDeptOpen((v) => !v)} className={`${btn} bg-slate-900 border-slate-800 text-slate-300 hover:border-indigo-500/30`}>
              <Building2 size={13} /> Assign Department
            </button>
            {deptOpen && (
              <div className="absolute left-0 mt-2 w-52 rounded-2xl bg-[#0b101d] border border-slate-800 shadow-2xl z-30 p-1.5">
                {departments.map((d) => (
                  <button key={d.id} onClick={() => { setDeptOpen(false); onBulk('assign_department', { department: d.name }); }} className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-900 hover:text-white transition-colors">
                    {d.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button disabled={busy} onClick={() => setRoleOpen((v) => !v)} className={`${btn} bg-slate-900 border-slate-800 text-slate-300 hover:border-indigo-500/30`}>
              <Crown size={13} /> Assign Role
            </button>
            {roleOpen && (
              <div className="absolute left-0 mt-2 w-52 rounded-2xl bg-[#0b101d] border border-slate-800 shadow-2xl z-30 p-1.5">
                {ROLE_OPTIONS.map((r) => (
                  <button key={r.value} onClick={() => { setRoleOpen(false); onBulk('assign_role', { role: r.value }); }} className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-900 hover:text-white transition-colors">
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <button disabled={busy} onClick={onExport} className={`${btn} bg-slate-900 border-slate-800 text-slate-300 hover:border-indigo-500/30`}>
        <Download size={13} /> Export
      </button>

      {canManage && (
        <button disabled={busy} onClick={() => onBulk('delete')} className={`${btn} bg-slate-900 border-slate-800 text-slate-400 hover:text-rose-300 hover:border-rose-500/30`}>
          <Trash2 size={13} /> Delete
        </button>
      )}

      <button onClick={onClear} className="ml-auto flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-300 transition-colors">
        <X size={12} /> Clear
      </button>
    </div>
  );
}
