'use client';

import { ShieldCheck, ShieldAlert, Lock, Archive, CheckCircle2, XCircle, GitBranch, TriangleAlert } from 'lucide-react';
import type { RoleStatus, MatrixCellState } from '@/types/roles';

const COLOR_CLASS: Record<string, string> = {
  amber: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
  indigo: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20',
  sky: 'text-sky-300 bg-sky-500/10 border-sky-500/20',
  teal: 'text-teal-300 bg-teal-500/10 border-teal-500/20',
  emerald: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  violet: 'text-violet-300 bg-violet-500/10 border-violet-500/20',
  cyan: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20',
  slate: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

export function RoleAvatar({ name, colorTag, size = 36 }: { name: string; colorTag?: string | null; size?: number }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const cls = COLOR_CLASS[colorTag || 'indigo'] || COLOR_CLASS.indigo;
  return (
    <div
      className={`rounded-xl border flex items-center justify-center font-black shrink-0 ${cls}`}
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {initials}
    </div>
  );
}

export function RoleKindBadge({ isSystem }: { isSystem: boolean }) {
  return isSystem ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border text-amber-300 bg-amber-500/10 border-amber-500/20 whitespace-nowrap">
      <ShieldCheck size={11} /> System
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border text-indigo-300 bg-indigo-500/10 border-indigo-500/20 whitespace-nowrap">
      <ShieldAlert size={11} /> Custom
    </span>
  );
}

export function RoleStatusBadge({ status }: { status: RoleStatus }) {
  return status === 'Active' ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border text-emerald-400 bg-emerald-400/10 border-emerald-400/20 whitespace-nowrap">
      <CheckCircle2 size={11} /> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border text-slate-600 bg-slate-800/40 border-slate-700/40 whitespace-nowrap">
      <Archive size={11} /> Archived
    </span>
  );
}

export function SensitiveBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border text-rose-300 bg-rose-500/10 border-rose-500/20 whitespace-nowrap">
      <TriangleAlert size={9} /> Sensitive
    </span>
  );
}

const MATRIX_CELL_CONFIG: Record<MatrixCellState, { icon: typeof CheckCircle2; className: string; label: string }> = {
  ALLOW: { icon: CheckCircle2, className: 'text-emerald-400', label: 'Allow' },
  DENY: { icon: XCircle, className: 'text-rose-400', label: 'Deny' },
  INHERITED: { icon: GitBranch, className: 'text-indigo-400', label: 'Inherited' },
  INHERITED_DENY: { icon: GitBranch, className: 'text-rose-400/70', label: 'Inherited Deny' },
  NONE: { icon: XCircle, className: 'text-slate-800', label: 'None' },
};

export function MatrixCellIcon({ state, size = 15 }: { state: MatrixCellState; size?: number }) {
  const cfg = MATRIX_CELL_CONFIG[state];
  const Icon = cfg.icon;
  return <Icon size={size} className={cfg.className} />;
}

export { MATRIX_CELL_CONFIG };

export function TemporaryBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border text-sky-300 bg-sky-500/10 border-sky-500/20 whitespace-nowrap">
      <Lock size={10} /> Temporary
    </span>
  );
}
