'use client';

import { useEffect, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { platformRolesApi } from '@/lib/api';
import type { RoleAssignmentRowDTO } from '@/types/roles';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';
import { TemporaryBadge } from './RoleBadges';

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString();
}

export default function RoleAssignmentTable() {
  const [rows, setRows] = useState<RoleAssignmentRowDTO[] | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    platformRolesApi.listAssignments({ search: debouncedSearch || undefined, limit: 100 }).then((res) => setRows(res.data)).catch(() => setRows([]));
  }, [debouncedSearch]);

  if (!rows) return <div className="h-48 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />;

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by user name..." className="w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none transition-colors" />
      </div>

      {rows.length === 0 ? (
        <PlatformEmptyState icon={Users} title="No role assignments" description="Assign roles to platform users from a role's detail page." />
      ) : (
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Current Role</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Assigned Date</th>
                <th className="px-4 py-3">Assigned By</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.assignmentId} className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/20">
                  <td className="px-4 py-3 text-xs font-bold text-slate-100">{r.fullName}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-300">{r.roleName}</span>
                      {r.isTemporary && <TemporaryBadge />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{r.department || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{fmtDate(r.assignedAt)}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{r.assignedByName || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
