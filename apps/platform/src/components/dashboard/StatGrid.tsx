'use client';

import React from 'react';

export default function StatGrid({ stats }: { stats: { label: string; value: string | number }[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="bg-slate-950/60 border border-slate-900 rounded-xl p-3">
          <span className="block text-base font-black text-slate-100">{s.value}</span>
          <span className="text-[9px] text-slate-500 uppercase tracking-wider">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
