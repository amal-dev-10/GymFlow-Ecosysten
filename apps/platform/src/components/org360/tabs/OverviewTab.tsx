'use client';

import { Building2, User, Mail, Phone, Globe, MapPin, Clock, Lightbulb, HeartPulse, ArrowRight, Activity } from 'lucide-react';
import type { Org360Overview } from '@/types/org360';
import { SectionCard, InfoRow, fmtDate, fmtDateTime, fmtRelative } from '../shared';
import { HealthBadge, ExperienceBadge, countryFlag } from '@/components/organizations/OrgBadges';

const HEALTH_BAR: Record<string, string> = {
  EXCELLENT: 'bg-emerald-500',
  GOOD: 'bg-lime-500',
  WARNING: 'bg-amber-500',
  CRITICAL: 'bg-rose-500',
};

export default function OverviewTab({ overview, onGoToTab }: { overview: Org360Overview; onGoToTab: (tab: string) => void }) {
  const o = overview;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left column — information */}
      <div className="lg:col-span-2 space-y-4">
        <SectionCard title="Organization Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            <InfoRow label="Name" value={o.name} />
            <InfoRow label="Code" value={<span className="font-mono">{o.slug}</span>} />
            <InfoRow label="Business Type" value={o.businessType || '—'} />
            <InfoRow label="Created" value={fmtDate(o.createdAt)} />
            <InfoRow label="Country" value={<span>{countryFlag(o.country)} {o.country || '—'}</span>} />
            <InfoRow label="Region" value={o.region} />
          </div>
        </SectionCard>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SectionCard title="Owner">
            {o.owner ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-300">
                    <User size={16} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-100 block truncate">{o.owner.name}</span>
                    <span className="text-[10px] text-slate-500">Organization Owner</span>
                  </div>
                </div>
                <div className="pt-2 space-y-1.5">
                  {o.owner.email && <div className="flex items-center gap-2 text-[11px] text-slate-400"><Mail size={12} /> {o.owner.email}</div>}
                  {o.owner.phone && <div className="flex items-center gap-2 text-[11px] text-slate-400"><Phone size={12} /> {o.owner.phone}</div>}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-600">No owner assigned.</p>
            )}
          </SectionCard>

          <SectionCard title="Contact & Locale">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[11px] text-slate-400"><Mail size={12} /> {o.email || '—'}</div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400"><Phone size={12} /> {o.phone || '—'}</div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400"><Globe size={12} /> {o.website || '—'}</div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400"><Clock size={12} /> {o.timezone || '—'} · {o.language || 'en'}</div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400"><MapPin size={12} /> {[o.addressLine1, o.city, o.state, o.postalCode].filter(Boolean).join(', ') || '—'}</div>
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Recent Activity" action={<button onClick={() => onGoToTab('activity')} className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">View all <ArrowRight size={11} /></button>}>
          {o.recentActivity.length === 0 ? (
            <p className="text-[11px] text-slate-600">No recent activity.</p>
          ) : (
            <div className="space-y-3">
              {o.recentActivity.slice(0, 6).map((e) => (
                <div key={e.id} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shrink-0 mt-0.5">
                    <Activity size={13} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-slate-200 block">{e.title}</span>
                    {e.detail && <span className="text-[11px] text-slate-500 block truncate">{e.detail}</span>}
                  </div>
                  <span className="text-[10px] text-slate-600 shrink-0">{fmtRelative(e.at)}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Right column — plan, health, recommendations */}
      <div className="space-y-4">
        <SectionCard title="Current Plan">
          <div className="flex items-center justify-between mb-3">
            <span className="text-base font-black text-slate-100">{o.plan?.name || 'No plan'}</span>
            <ExperienceBadge experience={o.workspaceExperience} />
          </div>
          <InfoRow label="Billing Cycle" value={o.plan?.billingCycle || '—'} />
          <InfoRow label="Subscription" value={o.subscriptionStatus} />
          <InfoRow label="Renewal" value={fmtDate(o.renewalDate)} />
          <button
            onClick={() => onGoToTab('subscription')}
            className="w-full mt-3 flex items-center justify-center gap-1.5 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-[11px] font-bold rounded-xl transition-colors"
          >
            Manage Subscription <ArrowRight size={12} />
          </button>
        </SectionCard>

        <SectionCard title="Health Summary">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative w-16 h-16 shrink-0">
              <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                <path d="M18 2 a 16 16 0 0 1 0 32 a 16 16 0 0 1 0 -32" fill="none" stroke="#1e293b" strokeWidth="3" />
                <path
                  d="M18 2 a 16 16 0 0 1 0 32 a 16 16 0 0 1 0 -32"
                  fill="none"
                  stroke={o.health.band === 'CRITICAL' ? '#f43f5e' : o.health.band === 'WARNING' ? '#f59e0b' : o.health.band === 'GOOD' ? '#84cc16' : '#10b981'}
                  strokeWidth="3"
                  strokeDasharray={`${o.health.score}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-slate-100">{o.health.score}</span>
            </div>
            <div>
              <HealthBadge band={o.health.band} score={o.health.score} showScore={false} />
              <p className="text-[10px] text-slate-500 mt-1">Composite platform health</p>
            </div>
          </div>
          <div className="space-y-1">
            {o.health.reasons.map((r, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className={`w-1.5 h-1.5 rounded-full ${HEALTH_BAR[o.health.band]}`} />
                {r}
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Platform Recommendations">
          <div className="space-y-2">
            {o.recommendations.map((r, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-900/50 border border-slate-850">
                <div className="flex items-center gap-1.5 mb-1">
                  <Lightbulb size={12} className="text-amber-400" />
                  <span className="text-[11px] font-bold text-slate-200">{r.title}</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">{r.detail}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
