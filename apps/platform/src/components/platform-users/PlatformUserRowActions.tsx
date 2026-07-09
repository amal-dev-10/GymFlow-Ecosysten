'use client';

import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, Eye, Pencil, KeyRound, ShieldOff, Ban, PlayCircle, PowerOff, Send, Trash2, Unlock } from 'lucide-react';
import type { PlatformUserRowDTO } from '@/types/platformUsers';

export interface RowActionGates {
  canManage: boolean;
  canDelete: boolean;
}

interface Props {
  user: PlatformUserRowDTO;
  gates: RowActionGates;
  onView: (user: PlatformUserRowDTO) => void;
  onEdit: (user: PlatformUserRowDTO) => void;
  onResetPassword: (user: PlatformUserRowDTO) => void;
  onResetMfa: (user: PlatformUserRowDTO) => void;
  onSuspend: (user: PlatformUserRowDTO) => void;
  onActivate: (user: PlatformUserRowDTO) => void;
  onDeactivate: (user: PlatformUserRowDTO) => void;
  onUnlock: (user: PlatformUserRowDTO) => void;
  onResendInvitation: (user: PlatformUserRowDTO) => void;
  onDelete: (user: PlatformUserRowDTO) => void;
}

export default function PlatformUserRowActions({ user, gates, onView, onEdit, onResetPassword, onResetMfa, onSuspend, onActivate, onDeactivate, onUnlock, onResendInvitation, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const [flipUp, setFlipUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setFlipUp(window.innerHeight - rect.bottom < 320);
    }
    setOpen((v) => !v);
  };

  const item = (icon: React.ReactNode, label: string, onClick: () => void, danger = false) => (
    <button
      onClick={() => {
        setOpen(false);
        onClick();
      }}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${danger ? 'text-rose-400 hover:bg-rose-500/10' : 'text-slate-300 hover:bg-slate-900 hover:text-white'}`}
    >
      {icon}
      {label}
    </button>
  );

  const isPending = user.status === 'PENDING_INVITATION';
  const isSuspended = user.status === 'SUSPENDED';
  const isDisabled = user.status === 'DISABLED';
  const isLocked = user.status === 'LOCKED';
  const isArchived = user.status === 'ARCHIVED';

  return (
    <div className="relative" ref={ref}>
      <button ref={btnRef} onClick={toggle} className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-300 transition-colors">
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div className={`absolute right-0 ${flipUp ? 'bottom-full mb-2' : 'top-full mt-2'} w-52 rounded-2xl bg-[#0b101d] border border-slate-800 shadow-2xl z-30 p-1.5 animate-fade-in`}>
          {item(<Eye size={14} className="text-indigo-400" />, 'View User', () => onView(user))}
          {gates.canManage && !isArchived && item(<Pencil size={14} className="text-indigo-400" />, 'Edit User', () => onEdit(user))}
          {gates.canManage && isPending && item(<Send size={14} className="text-sky-400" />, 'Send Invitation Again', () => onResendInvitation(user))}
          {gates.canManage && !isPending && !isArchived && (
            <>
              <div className="my-1 border-t border-slate-850" />
              {item(<KeyRound size={14} />, 'Reset Password', () => onResetPassword(user))}
              {item(<ShieldOff size={14} />, 'Reset MFA', () => onResetMfa(user))}
            </>
          )}
          {gates.canManage && (
            <>
              <div className="my-1 border-t border-slate-850" />
              {isLocked && item(<Unlock size={14} className="text-emerald-400" />, 'Unlock', () => onUnlock(user))}
              {!isPending && !isSuspended && !isArchived && !isLocked && item(<Ban size={14} />, 'Suspend', () => onSuspend(user), true)}
              {(isSuspended || isDisabled) && item(<PlayCircle size={14} className="text-emerald-400" />, 'Activate', () => onActivate(user))}
              {!isDisabled && !isArchived && !isPending && item(<PowerOff size={14} />, 'Deactivate', () => onDeactivate(user), true)}
            </>
          )}
          {gates.canDelete && (
            <>
              <div className="my-1 border-t border-slate-850" />
              {item(<Trash2 size={14} />, 'Delete', () => onDelete(user), true)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
