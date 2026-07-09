'use client';

import { Building2, Users, HardDrive, Layers, Crown, Clock } from 'lucide-react';
import type { OrgSnapshotDTO } from '@/types/support';

const HEALTH_TONE: Record<string, string> = { HEALTHY: 'text-emerald-400', WARNING: 'text-amber-400', CRITICAL: 'text-rose-400' };

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString() : 'Never';
}

export default function OrgSummaryCard({ org }: { org: OrgSnapshotDTO }) {
  return (
    <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200"><Building2 size={13} className="text-indigo-400" /> {org.name}</span>
        <span className={`text-[10px] font-black ${HEALTH_TONE[org.health.band] || 'text-slate-400'}`}>{org.health.score}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-400"><Layers size={11} className="text-slate-600" /> {org.plan?.name || 'No plan'}</div>
        <div className="flex items-center gap-1.5 text-slate-400"><Crown size={11} className="text-slate-600" /> {org.owner?.name || 'No owner'}</div>
        <div className="flex items-center gap-1.5 text-slate-400"><Users size={11} className="text-slate-600" /> {org.usage.members.used} members</div>
        <div className="flex items-center gap-1.5 text-slate-400"><Building2 size={11} className="text-slate-600" /> {org.usage.branches.used} branches</div>
        <div className="flex items-center gap-1.5 text-slate-400"><HardDrive size={11} className="text-slate-600" /> {org.usage.storage.used}{org.usage.storage.unit} used</div>
        <div className="flex items-center gap-1.5 text-slate-400"><Clock size={11} className="text-slate-600" /> {fmtDate(org.lastActiveAt)}</div>
      </div>

      <span className="inline-flex items-center text-[10px] font-bold px-2 py-1 rounded-full border text-slate-300 bg-slate-900 border-slate-800">{org.derivedStatus}</span>
    </div>
  );
}
