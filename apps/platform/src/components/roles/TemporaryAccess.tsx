'use client';

import { useEffect, useState } from 'react';
import { Clock, Plus, Ban, ShieldCheck, XCircle } from 'lucide-react';
import { platformRolesApi, handleApiError } from '@/lib/api';
import type { TemporaryAccessRowDTO, AssignmentStatus } from '@/types/roles';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';
import GrantTemporaryAccessModal from './GrantTemporaryAccessModal';

const STATUS_CONFIG: Record<AssignmentStatus, { label: string; icon: typeof ShieldCheck; className: string }> = {
  Active: { label: 'Active', icon: ShieldCheck, className: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  Expired: { label: 'Expired', icon: Clock, className: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  Revoked: { label: 'Revoked', icon: XCircle, className: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
};

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleString() : '—';
}

export default function TemporaryAccess({ canManage, showToast }: { canManage: boolean; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [grants, setGrants] = useState<TemporaryAccessRowDTO[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<TemporaryAccessRowDTO | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    platformRolesApi.listTemporaryAccess({ status: statusFilter || undefined, limit: 100 }).then((res) => setGrants(res.data)).catch(() => setGrants([]));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const revoke = async () => {
    if (!revokeTarget) return;
    setBusy(true);
    try {
      await platformRolesApi.revokeTemporaryAccess(revokeTarget.id);
      showToast(`Temporary access for ${revokeTarget.fullName} revoked.`);
      setRevokeTarget(null);
      load();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!grants) return <div className="h-48 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-[#0b101d] border border-slate-800/80 hover:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none cursor-pointer w-fit">
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Expired">Expired</option>
          <option value="Revoked">Revoked</option>
        </select>
        {canManage && (
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors shrink-0">
            <Plus size={14} /> Grant Temporary Access
          </button>
        )}
      </div>

      {grants.length === 0 ? (
        <PlatformEmptyState icon={Clock} title="No temporary access grants" description="Grant time-boxed role access for coverage, incidents, or short-term projects." />
      ) : (
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Approver</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {grants.map((g) => {
                const cfg = STATUS_CONFIG[g.status];
                const Icon = cfg.icon;
                return (
                  <tr key={g.id} className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/20">
                    <td className="px-4 py-3 text-xs font-bold text-slate-100">{g.fullName}</td>
                    <td className="px-4 py-3 text-xs text-slate-300">{g.roleName}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 max-w-[220px] truncate">{g.reason || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{g.approverName || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{fmtDate(g.expiresAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${cfg.className}`}>
                        <Icon size={11} /> {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canManage && g.status === 'Active' && (
                        <button onClick={() => setRevokeTarget(g)} className="flex items-center gap-1 ml-auto px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 text-rose-300 text-[11px] font-bold transition-colors">
                          <Ban size={11} /> Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <GrantTemporaryAccessModal onClose={() => setModalOpen(false)} onGranted={() => { setModalOpen(false); load(); }} showToast={showToast} />
      )}

      {revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md">
          <div className="fixed inset-0" onClick={() => setRevokeTarget(null)} />
          <div className="w-full max-w-sm bg-[#0b101d] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10">
            <h3 className="text-base font-extrabold text-white mb-2">Revoke Temporary Access</h3>
            <p className="text-xs text-slate-400 mb-5">Revoke <b className="text-slate-200">{revokeTarget.roleName}</b> access for <b className="text-slate-200">{revokeTarget.fullName}</b>? This takes effect immediately.</p>
            <div className="flex gap-3">
              <button onClick={() => setRevokeTarget(null)} className="flex-1 py-3 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all">Cancel</button>
              <button onClick={revoke} disabled={busy} className="flex-1 py-3 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 text-rose-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40">{busy ? 'Revoking...' : 'Revoke'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
