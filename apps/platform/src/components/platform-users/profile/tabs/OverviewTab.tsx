'use client';

import { CheckCircle2 } from 'lucide-react';
import { SectionCard, InfoRow, fmtDate, fmtRelative } from '@/components/org360/shared';
import type { PlatformUserProfileDTO } from '@/types/platformUsers';

export default function OverviewTab({ profile: p }: { profile: PlatformUserProfileDTO }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <SectionCard title="Profile">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            <InfoRow label="Full Name" value={p.fullName} />
            <InfoRow label="Email" value={p.email || '—'} />
            <InfoRow label="Phone" value={p.phone} />
            <InfoRow label="Department" value={p.department || '—'} />
            <InfoRow label="Role" value={p.role.replace('_', ' ')} />
            <InfoRow label="Created" value={fmtDate(p.createdAt)} />
            <InfoRow label="Invited By" value={p.invitedByName || '—'} />
            <InfoRow label="Accepted" value={p.acceptedAt ? fmtDate(p.acceptedAt) : 'Not yet accepted'} />
            <InfoRow label="Last Login" value={fmtRelative(p.lastLoginAt)} />
            <InfoRow label="Last Activity" value={fmtRelative(p.lastActivityAt)} />
          </div>
        </SectionCard>
      </div>

      <div className="space-y-4">
        <SectionCard title="Permissions">
          {p.permissions.length === 0 ? (
            <p className="text-[11px] text-slate-600">No permissions configured for this role.</p>
          ) : (
            <div className="space-y-1.5">
              {p.permissions.map((perm) => (
                <div key={perm} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/40 border border-slate-850">
                  <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                  <span className="text-xs text-slate-300">{perm}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
