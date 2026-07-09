'use client';

import { Clock, CheckCircle2, Ban, PowerOff, Lock, Archive, ShieldCheck, ShieldOff, Crown, Wrench, LifeBuoy, HeartHandshake, DollarSign, TrendingUp, Code2, Megaphone } from 'lucide-react';
import type { PlatformUserStatus, PlatformRole } from '@/types/platformUsers';

const STATUS_CONFIG: Record<PlatformUserStatus, { label: string; icon: typeof Clock; className: string }> = {
  PENDING_INVITATION: { label: 'Pending Invitation', icon: Clock, className: 'text-sky-300 bg-sky-500/10 border-sky-500/20' },
  ACTIVE: { label: 'Active', icon: CheckCircle2, className: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  SUSPENDED: { label: 'Suspended', icon: Ban, className: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  DISABLED: { label: 'Disabled', icon: PowerOff, className: 'text-slate-500 bg-slate-500/10 border-slate-500/20' },
  LOCKED: { label: 'Locked', icon: Lock, className: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  ARCHIVED: { label: 'Archived', icon: Archive, className: 'text-slate-600 bg-slate-800/40 border-slate-700/40' },
};

export function PlatformUserStatusBadge({ status }: { status: PlatformUserStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${cfg.className}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

const ROLE_CONFIG: Record<PlatformRole, { label: string; icon: typeof Crown; className: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', icon: Crown, className: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
  OPERATIONS: { label: 'Operations', icon: Wrench, className: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20' },
  FINANCE: { label: 'Finance', icon: DollarSign, className: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' },
  SALES: { label: 'Sales', icon: TrendingUp, className: 'text-violet-300 bg-violet-500/10 border-violet-500/20' },
  SUPPORT: { label: 'Support', icon: LifeBuoy, className: 'text-sky-300 bg-sky-500/10 border-sky-500/20' },
  DEVELOPER: { label: 'Developer', icon: Code2, className: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20' },
  MARKETING: { label: 'Marketing', icon: Megaphone, className: 'text-pink-300 bg-pink-500/10 border-pink-500/20' },
  CUSTOMER_SUCCESS: { label: 'Customer Success', icon: HeartHandshake, className: 'text-teal-300 bg-teal-500/10 border-teal-500/20' },
};

export function PlatformRoleBadge({ role }: { role: PlatformRole }) {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.SUPPORT;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${cfg.className}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

export function MfaBadge({ enabled }: { enabled: boolean }) {
  return enabled ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border text-emerald-400 bg-emerald-400/10 border-emerald-400/20">
      <ShieldCheck size={11} /> On
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border text-slate-500 bg-slate-500/10 border-slate-500/20">
      <ShieldOff size={11} /> Off
    </span>
  );
}

export function OnlineDot({ online }: { online: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
      <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
      {online ? 'Online' : 'Offline'}
    </span>
  );
}

export function PlatformUserAvatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <div
      className="rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 border border-slate-800 flex items-center justify-center font-black text-indigo-300 shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {initials}
    </div>
  );
}

export const ROLE_OPTIONS: { value: PlatformRole; label: string }[] = Object.entries(ROLE_CONFIG).map(([value, cfg]) => ({ value: value as PlatformRole, label: cfg.label }));
