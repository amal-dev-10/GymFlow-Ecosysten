'use client';

import { useEffect, useState } from 'react';
import { Plus, X, Building2 } from 'lucide-react';
import { SectionCard, EmptyRow, fmtDate } from '@/components/org360/shared';
import { platformOrganizationsApi, platformUsersApi, handleApiError } from '@/lib/api';
import type { AssignedOrganization } from '@/types/platformUsers';
import type { OrganizationRowDTO } from '@/types/organizations';

const selectClass = 'bg-[#0b101d] border border-slate-800/80 hover:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none transition-colors cursor-pointer';

const ACCESS_TONE: Record<string, string> = {
  View: 'text-slate-300 bg-slate-500/10 border-slate-500/20',
  Manage: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20',
  Full: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
};

export default function OrganizationsTab({
  platformUserId,
  assignedOrganizations,
  canManage,
  onChanged,
  showToast,
}: {
  platformUserId: string;
  assignedOrganizations: AssignedOrganization[];
  canManage: boolean;
  onChanged: () => void;
  showToast: (m: string, t?: 'success' | 'error') => void;
}) {
  const [assignOpen, setAssignOpen] = useState(false);
  const [allOrgs, setAllOrgs] = useState<OrganizationRowDTO[]>([]);
  const [orgId, setOrgId] = useState('');
  const [accessLevel, setAccessLevel] = useState('View');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (assignOpen && allOrgs.length === 0) {
      platformOrganizationsApi.list({ limit: 100 }).then((res) => setAllOrgs(res.data)).catch(() => setAllOrgs([]));
    }
  }, [assignOpen, allOrgs.length]);

  const active = assignedOrganizations.filter((a) => a.status === 'Active');
  const candidateOrgs = allOrgs.filter((o) => !active.some((a) => a.organization.id === o.id));

  const assign = async () => {
    if (!orgId) return;
    setBusy(true);
    try {
      await platformUsersApi.assignOrganization(platformUserId, orgId, accessLevel);
      showToast('Organization assigned.');
      setAssignOpen(false);
      setOrgId('');
      onChanged();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (assignmentId: string) => {
    try {
      await platformUsersApi.removeOrganizationAssignment(platformUserId, assignmentId);
      showToast('Assignment removed.');
      onChanged();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    }
  };

  return (
    <SectionCard
      title="Assigned Organizations"
      action={
        canManage && (
          <button onClick={() => setAssignOpen((v) => !v)} className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300">
            <Plus size={11} /> Assign
          </button>
        )
      }
    >
      <p className="text-[11px] text-slate-500 mb-3">Support and Customer Success staff can optionally be assigned specific organizations they manage.</p>

      {assignOpen && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4 p-3 rounded-xl bg-slate-900/40 border border-slate-850">
          <select value={orgId} onChange={(e) => setOrgId(e.target.value)} className={`${selectClass} flex-1`}>
            <option value="">Select an organization...</option>
            {candidateOrgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <select value={accessLevel} onChange={(e) => setAccessLevel(e.target.value)} className={selectClass}>
            <option value="View">View</option>
            <option value="Manage">Manage</option>
            <option value="Full">Full</option>
          </select>
          <button onClick={assign} disabled={!orgId || busy} className="px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40 shrink-0">
            {busy ? '...' : 'Assign'}
          </button>
        </div>
      )}

      {active.length === 0 ? (
        <div className="text-center py-4">
          <Building2 size={18} className="text-slate-700 mx-auto mb-2" />
          <EmptyRow text="No organizations assigned." />
        </div>
      ) : (
        <div className="space-y-2">
          {active.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-850">
              <div>
                <span className="text-xs font-bold text-slate-200">{a.organization.name}</span>
                <span className="block text-[10px] text-slate-500">Assigned {fmtDate(a.assignedAt)}{a.assignedByName ? ` by ${a.assignedByName}` : ''}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ACCESS_TONE[a.accessLevel] || ACCESS_TONE.View}`}>{a.accessLevel}</span>
                {canManage && (
                  <button onClick={() => remove(a.id)} className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-rose-500/30 text-slate-500 hover:text-rose-400 transition-colors">
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
