'use client';

import {
  Info, ArrowDown, AlertTriangle, ArrowUp, Flame, CheckCircle2, XCircle, Monitor, Smartphone, Tablet,
  KeyRound, Building2, Repeat, Users, UserRound, CalendarCheck, Dumbbell, Apple, Receipt, CreditCard,
  Wallet, FileBarChart, Flag, LifeBuoy, Activity, Webhook, Terminal, ShieldAlert, Server, type LucideIcon,
} from 'lucide-react';
import type { Severity, EventStatus } from '@/types/audit';

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  Authentication: KeyRound,
  Organizations: Building2,
  'Organization Management': Building2,
  Subscriptions: Repeat,
  Commercial: Repeat,
  'Platform Users': Users,
  Members: UserRound,
  Attendance: CalendarCheck,
  'Training Studio': Dumbbell,
  Nutrition: Apple,
  Billing: Receipt,
  Payments: CreditCard,
  Expenses: Wallet,
  Reports: FileBarChart,
  'Feature Flags': Flag,
  'Feature Engine': Flag,
  Support: LifeBuoy,
  Monitoring: Activity,
  API: Webhook,
  Developer: Terminal,
  Security: ShieldAlert,
  'Roles & Permissions': ShieldAlert,
  Session: KeyRound,
  System: Server,
};

export function getCategoryIcon(category: string | null): LucideIcon {
  return (category && CATEGORY_ICON_MAP[category]) || Activity;
}

const SEVERITY_CONFIG: Record<Severity, { icon: typeof Info; className: string }> = {
  Information: { icon: Info, className: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
  Low: { icon: ArrowDown, className: 'text-sky-300 bg-sky-500/10 border-sky-500/20' },
  Medium: { icon: AlertTriangle, className: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
  High: { icon: ArrowUp, className: 'text-orange-300 bg-orange-500/10 border-orange-500/20' },
  Critical: { icon: Flame, className: 'text-rose-300 bg-rose-500/10 border-rose-500/20' },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.Information;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${cfg.className}`}>
      <Icon size={11} /> {severity}
    </span>
  );
}

export function StatusBadge({ status }: { status: EventStatus }) {
  return status === 'Success' ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border text-emerald-400 bg-emerald-400/10 border-emerald-400/20 whitespace-nowrap">
      <CheckCircle2 size={11} /> Success
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border text-rose-400 bg-rose-500/10 border-rose-500/20 whitespace-nowrap">
      <XCircle size={11} /> Failure
    </span>
  );
}

export function CategoryPill({ category }: { category: string | null }) {
  return (
    <span className="text-[10px] font-semibold text-slate-400 bg-slate-900 border border-slate-850 px-2 py-1 rounded-full whitespace-nowrap">
      {category || 'Uncategorized'}
    </span>
  );
}

export function DeviceIcon({ device, size = 12 }: { device: string; size?: number }) {
  if (device === 'Mobile') return <Smartphone size={size} className="text-slate-500" />;
  if (device === 'Tablet') return <Tablet size={size} className="text-slate-500" />;
  return <Monitor size={size} className="text-slate-500" />;
}
