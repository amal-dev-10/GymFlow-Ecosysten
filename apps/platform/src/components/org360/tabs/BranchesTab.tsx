'use client';

import { useEffect, useState } from 'react';
import { Building, Users, UserCog, CalendarCheck, ExternalLink } from 'lucide-react';
import { platformOrganizationsApi, handleApiError } from '@/lib/api';
import type { Org360Branch } from '@/types/org360';
import { SectionCard, TabLoading, EmptyRow, fmtDate } from '../shared';

export default function BranchesTab({ orgId, showToast }: { orgId: string; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [branches, setBranches] = useState<Org360Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    platformOrganizationsApi.getBranches(orgId).then(setBranches).catch((e) => showToast(handleApiError(e), 'error')).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  if (loading) return <TabLoading />;
  if (branches.length === 0) return <SectionCard><EmptyRow text="This organization has no branches yet." /></SectionCard>;

  const totalMembers = branches.reduce((s, b) => s + b.members, 0);
  const totalEmployees = branches.reduce((s, b) => s + b.employees, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Branches', value: branches.length, icon: Building },
          { label: 'Total Members', value: totalMembers, icon: Users },
          { label: 'Total Staff', value: totalEmployees, icon: UserCog },
        ].map((s) => (
          <div key={s.label} className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{s.label}</span>
              <s.icon size={14} className="text-indigo-400" />
            </div>
            <span className="text-xl font-black text-slate-100 block mt-2">{s.value}</span>
          </div>
        ))}
      </div>

      <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-x-auto">
        <table className="w-full text-left min-w-[720px]">
          <thead>
            <tr className="border-b border-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Members</th>
              <th className="px-4 py-3">Staff</th>
              <th className="px-4 py-3">Attendance (mo)</th>
              <th className="px-4 py-3">Manager</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => (
              <tr key={b.id} className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/30 transition-colors">
                <td className="px-4 py-3">
                  <span className="text-xs font-bold text-slate-100">{b.name}</span>
                  {b.code && <span className="block text-[10px] text-slate-600 font-mono">{b.code}</span>}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border text-emerald-400 bg-emerald-400/10 border-emerald-400/20">{b.status}</span>
                </td>
                <td className="px-4 py-3 text-xs font-semibold text-slate-300">{b.members}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{b.employees}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400"><CalendarCheck size={12} className="text-slate-600" /> {b.attendanceThisMonth}</span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">{b.manager || '—'}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(b.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => showToast('Branch drill-down opens the tenant workspace (via impersonation).')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/30 text-[10px] font-bold text-slate-400 hover:text-indigo-300 transition-colors"
                  >
                    <ExternalLink size={11} /> Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
