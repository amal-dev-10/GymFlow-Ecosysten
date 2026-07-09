'use client';

import { ShieldCheck, ShieldOff, KeyRound, AlertTriangle, Clock, MapPin } from 'lucide-react';
import { SectionCard, InfoRow, EmptyRow, fmtDateTime, fmtDate } from '@/components/org360/shared';
import type { PlatformUserProfileDTO } from '@/types/platformUsers';

export default function SecurityTab({ profile: p, canManage, onResetMfa }: { profile: PlatformUserProfileDTO; canManage: boolean; onResetMfa: () => void }) {
  const s = p.security;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-4">
        <SectionCard
          title="Multi-Factor Authentication"
          action={
            s.mfaEnabled ? <ShieldCheck size={14} className="text-emerald-400" /> : <ShieldOff size={14} className="text-slate-500" />
          }
        >
          <InfoRow label="MFA Status" value={s.mfaEnabled ? 'Enabled' : 'Disabled'} />
          <InfoRow label="Enabled On" value={s.mfaEnabledAt ? fmtDate(s.mfaEnabledAt) : '—'} />
          <InfoRow label="Recovery Codes Remaining" value={s.mfaRecoveryCodesRemaining != null ? String(s.mfaRecoveryCodesRemaining) : '—'} />
          {canManage && s.mfaEnabled && (
            <button onClick={onResetMfa} className="w-full mt-3 flex items-center justify-center gap-1.5 py-2 bg-slate-900 border border-slate-800 hover:border-rose-500/30 text-slate-300 hover:text-rose-300 text-[11px] font-bold rounded-xl transition-colors">
              <KeyRound size={12} /> Reset MFA
            </button>
          )}
        </SectionCard>

        <SectionCard title="Account Security">
          <InfoRow
            label="Failed Login Attempts"
            value={<span className={s.failedLoginAttempts > 0 ? 'text-amber-400' : ''}>{s.failedLoginAttempts}</span>}
          />
          <InfoRow label="Locked Until" value={s.lockedUntil ? fmtDateTime(s.lockedUntil) : 'Not locked'} />
          <InfoRow label="Session Timeout" value={`${s.sessionTimeoutMinutes} minutes`} />
        </SectionCard>
      </div>

      <SectionCard title="Recent Logins" action={<Clock size={14} className="text-slate-600" />}>
        {s.recentLogins.length === 0 ? (
          <EmptyRow text="No login attempts recorded." />
        ) : (
          <div className="space-y-2">
            {s.recentLogins.map((l) => (
              <div key={l.id} className="flex items-center justify-between py-2 border-b border-slate-900/60 last:border-0">
                <div>
                  <span className="text-xs font-semibold text-slate-300">{l.device} · {l.browser}</span>
                  <span className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5"><MapPin size={10} /> {l.ipAddress}</span>
                </div>
                <span className="text-[10px] text-slate-500">{fmtDateTime(l.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
        {p.failedLoginAttempts > 0 && (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-2">
            <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
            <span className="text-[11px] text-amber-300">{p.failedLoginAttempts} recent failed login attempt(s) recorded.</span>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
