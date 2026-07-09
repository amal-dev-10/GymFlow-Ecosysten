'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, KeyRound, ShieldOff, Ban, PlayCircle, PowerOff, Unlock, Trash2, Send } from 'lucide-react';
import { PlatformUserAvatar, PlatformUserStatusBadge, PlatformRoleBadge, MfaBadge, OnlineDot } from '../PlatformUserBadges';
import type { PlatformUserProfileDTO } from '@/types/platformUsers';

interface Props {
  profile: PlatformUserProfileDTO;
  canManage: boolean;
  canDelete: boolean;
  actions: {
    onResetPassword: () => void;
    onResetMfa: () => void;
    onSuspend: () => void;
    onActivate: () => void;
    onDeactivate: () => void;
    onUnlock: () => void;
    onResendInvitation: () => void;
    onDelete: () => void;
  };
}

export default function ProfileHeader({ profile: p, canManage, canDelete, actions }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isPending = p.status === 'PENDING_INVITATION';
  const isSuspended = p.status === 'SUSPENDED';
  const isDisabled = p.status === 'DISABLED';
  const isLocked = p.status === 'LOCKED';
  const isArchived = p.status === 'ARCHIVED';

  const item = (icon: React.ReactNode, label: string, onClick: () => void, danger = false) => (
    <button
      onClick={() => { setOpen(false); onClick(); }}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${danger ? 'text-rose-400 hover:bg-rose-500/10' : 'text-slate-300 hover:bg-slate-900 hover:text-white'}`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <PlatformUserAvatar name={p.fullName} size={52} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-50 tracking-tight">{p.fullName}</h1>
            <PlatformUserStatusBadge status={p.status} />
            <PlatformRoleBadge role={p.role} />
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-1.5 text-[11px] text-slate-500">
            <span>{p.email || p.phone}</span>
            <span>·</span>
            <span>{p.department || 'No department'}</span>
            <span>·</span>
            <MfaBadge enabled={p.mfaEnabled} />
            <span>·</span>
            <OnlineDot online={p.online} />
          </div>
          {isSuspended && p.suspendReason && <p className="text-[11px] text-rose-400 mt-1.5">Suspended: {p.suspendReason}</p>}
          {isLocked && <p className="text-[11px] text-amber-400 mt-1.5">Locked after {p.failedLoginAttempts} failed login attempts.</p>}
        </div>
      </div>

      {canManage && (
        <div className="relative shrink-0" ref={ref}>
          <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors">
            Quick Actions
            <ChevronDown size={13} />
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#0b101d] border border-slate-800 shadow-2xl z-30 p-1.5 animate-fade-in">
              {isPending && item(<Send size={14} className="text-sky-400" />, 'Send Invitation Again', actions.onResendInvitation)}
              {!isPending && !isArchived && (
                <>
                  {item(<KeyRound size={14} />, 'Reset Password', actions.onResetPassword)}
                  {item(<ShieldOff size={14} />, 'Reset MFA', actions.onResetMfa)}
                </>
              )}
              <div className="my-1 border-t border-slate-850" />
              {isLocked && item(<Unlock size={14} className="text-emerald-400" />, 'Unlock', actions.onUnlock)}
              {!isPending && !isSuspended && !isArchived && !isLocked && item(<Ban size={14} />, 'Suspend', actions.onSuspend, true)}
              {(isSuspended || isDisabled) && item(<PlayCircle size={14} className="text-emerald-400" />, 'Activate', actions.onActivate)}
              {!isDisabled && !isArchived && !isPending && item(<PowerOff size={14} />, 'Deactivate', actions.onDeactivate, true)}
              {canDelete && (
                <>
                  <div className="my-1 border-t border-slate-850" />
                  {item(<Trash2 size={14} />, 'Delete', actions.onDelete, true)}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
