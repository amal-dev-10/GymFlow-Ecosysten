'use client';

import { CheckCircle2, Clock, Ban, AlertOctagon, Archive, Gauge, Layers, Sparkles, HeartPulse, AlertTriangle, PauseCircle, HourglassIcon } from 'lucide-react';
import type { DerivedStatus, HealthBand, WorkspaceExperience, PaymentStatus } from '@/types/organizations';

const STATUS_CONFIG: Record<DerivedStatus, { label: string; icon: typeof CheckCircle2; className: string; dot: string }> = {
  ACTIVE: { label: 'Active', icon: CheckCircle2, className: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', dot: 'bg-emerald-500' },
  TRIAL: { label: 'Trial', icon: Clock, className: 'text-sky-300 bg-sky-500/10 border-sky-500/20', dot: 'bg-sky-500' },
  GRACE_PERIOD: { label: 'Grace Period', icon: AlertTriangle, className: 'text-amber-400 bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-500' },
  PAUSED: { label: 'Paused', icon: PauseCircle, className: 'text-slate-300 bg-slate-500/10 border-slate-500/20', dot: 'bg-slate-400' },
  PENDING_PAYMENT: { label: 'Pending Payment', icon: HourglassIcon, className: 'text-amber-300 bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-400' },
  SUSPENDED: { label: 'Suspended', icon: Ban, className: 'text-rose-400 bg-rose-500/10 border-rose-500/20', dot: 'bg-rose-500' },
  EXPIRED: { label: 'Expired', icon: AlertOctagon, className: 'text-amber-400 bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-500' },
  ARCHIVED: { label: 'Archived', icon: Archive, className: 'text-slate-500 bg-slate-500/10 border-slate-500/20', dot: 'bg-slate-500' },
};

export function OrgStatusBadge({ status }: { status: DerivedStatus }) {
  const { label, icon: Icon, className } = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${className}`}>
      <Icon size={11} />
      {label}
    </span>
  );
}

const HEALTH_CONFIG: Record<HealthBand, { label: string; className: string; bar: string }> = {
  EXCELLENT: { label: 'Excellent', className: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', bar: 'bg-emerald-500' },
  GOOD: { label: 'Good', className: 'text-lime-300 bg-lime-500/10 border-lime-500/20', bar: 'bg-lime-500' },
  WARNING: { label: 'Warning', className: 'text-amber-400 bg-amber-500/10 border-amber-500/20', bar: 'bg-amber-500' },
  CRITICAL: { label: 'Critical', className: 'text-rose-400 bg-rose-500/10 border-rose-500/20', bar: 'bg-rose-500' },
};

export function HealthBadge({ band, score, showScore = true }: { band: HealthBand; score: number; showScore?: boolean }) {
  const { label, className } = HEALTH_CONFIG[band];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${className}`}>
      <HeartPulse size={11} />
      {showScore ? `${score}` : label}
    </span>
  );
}

export function HealthDial({ band, score }: { band: HealthBand; score: number }) {
  const { bar } = HEALTH_CONFIG[band];
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-14 rounded-full bg-slate-900 border border-slate-850 overflow-hidden">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[11px] font-bold text-slate-300 w-6">{score}</span>
    </div>
  );
}

const EXPERIENCE_CONFIG: Record<WorkspaceExperience, { label: string; icon: typeof Gauge; className: string }> = {
  ESSENTIAL: { label: 'Essential', icon: Gauge, className: 'text-slate-300 bg-slate-500/10 border-slate-500/20' },
  PROFESSIONAL: { label: 'Professional', icon: Layers, className: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20' },
  EXPERT: { label: 'Expert', icon: Sparkles, className: 'text-violet-300 bg-violet-500/10 border-violet-500/20' },
};

export function ExperienceBadge({ experience }: { experience: WorkspaceExperience }) {
  const { label, icon: Icon, className } = EXPERIENCE_CONFIG[experience];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${className}`}>
      <Icon size={11} />
      {label}
    </span>
  );
}

export function PaymentDot({ status }: { status: PaymentStatus }) {
  if (status === 'NONE') return null;
  const cfg =
    status === 'FAILED'
      ? { label: 'Payment failed', className: 'text-rose-400 bg-rose-500/10 border-rose-500/20' }
      : { label: 'Paid', className: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' };
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// Small flag glyphs for the countries in the demo dataset; falls back to a
// generic marker so any country still renders cleanly.
const COUNTRY_FLAGS: Record<string, string> = {
  'United States': '🇺🇸',
  'United Kingdom': '🇬🇧',
  Germany: '🇩🇪',
  Australia: '🇦🇺',
  Canada: '🇨🇦',
  'United Arab Emirates': '🇦🇪',
  Singapore: '🇸🇬',
  Japan: '🇯🇵',
  India: '🇮🇳',
};

export function countryFlag(country: string | null): string {
  if (!country) return '🌐';
  return COUNTRY_FLAGS[country] || '🌐';
}

export function OrgLogo({ name, logoUrl, size = 36 }: { name: string; logoUrl?: string | null; size?: number }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  if (logoUrl) {
    return <img src={logoUrl} alt={name} width={size} height={size} className="rounded-xl object-cover border border-slate-800" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 border border-slate-800 flex items-center justify-center font-black text-indigo-300 shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {initials}
    </div>
  );
}
