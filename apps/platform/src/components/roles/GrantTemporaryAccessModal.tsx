'use client';

import { useEffect, useState } from 'react';
import { X, Clock } from 'lucide-react';
import { platformRolesApi, platformUsersApi, handleApiError } from '@/lib/api';
import type { RoleListItemDTO } from '@/types/roles';
import type { PlatformUserRowDTO } from '@/types/platformUsers';

const inputClass = 'w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none';
const selectClass = inputClass + ' cursor-pointer';

function defaultExpiry() {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 16);
}

export default function GrantTemporaryAccessModal({
  onClose,
  onGranted,
  showToast,
}: {
  onClose: () => void;
  onGranted: () => void;
  showToast: (m: string, t?: 'success' | 'error') => void;
}) {
  const [users, setUsers] = useState<PlatformUserRowDTO[]>([]);
  const [roles, setRoles] = useState<RoleListItemDTO[]>([]);
  const [platformUserId, setPlatformUserId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [reason, setReason] = useState('');
  const [approverName, setApproverName] = useState('');
  const [expiresAt, setExpiresAt] = useState(defaultExpiry());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    platformUsersApi.list({ limit: 100 }).then((res) => setUsers(res.data)).catch(() => setUsers([]));
    platformRolesApi.list({ limit: 100, status: 'Active' }).then((res) => setRoles(res.data)).catch(() => setRoles([]));
  }, []);

  const canSubmit = platformUserId && roleId && reason.trim() && approverName.trim() && expiresAt;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      await platformRolesApi.grantTemporaryAccess({
        platformUserId,
        roleId,
        reason: reason.trim(),
        approverName: approverName.trim(),
        expiresAt: new Date(expiresAt).toISOString(),
      });
      showToast('Temporary access granted.');
      onGranted();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="w-full max-w-md bg-[#0b101d] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2"><Clock size={18} className="text-sky-400" /> Grant Temporary Access</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={16} /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">User</label>
            <select value={platformUserId} onChange={(e) => setPlatformUserId(e.target.value)} className={selectClass}>
              <option value="">Select a platform user...</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Role</label>
            <select value={roleId} onChange={(e) => setRoleId(e.target.value)} className={selectClass}>
              <option value="">Select a role...</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Reason</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Why does this user need temporary access?" className={inputClass} />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Expiration</label>
            <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Approver</label>
            <input value={approverName} onChange={(e) => setApproverName(e.target.value)} placeholder="Who approved this grant?" className={inputClass} />
          </div>
          <p className="text-[10px] text-slate-600">Access is automatically revoked once the expiration passes.</p>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all">Cancel</button>
          <button onClick={submit} disabled={busy || !canSubmit} className="flex-1 py-3 bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/15 text-sky-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40">
            {busy ? 'Granting...' : 'Grant Access'}
          </button>
        </div>
      </div>
    </div>
  );
}
