'use client';

function fmtValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/**
 * Renders metadata.before/after (the standard convention for change events
 * going forward - see platform-audit.service.ts's doc comments). Highlights
 * only the fields that actually differ between the two snapshots.
 */
export default function AuditDiffViewer({ before, after }: { before: Record<string, unknown>; after: Record<string, unknown> }) {
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort();

  return (
    <div className="bg-[#07090e] border border-slate-800/80 rounded-2xl overflow-hidden">
      <div className="grid grid-cols-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-900/60">
        <div className="px-4 py-2 border-r border-slate-900/60">Before</div>
        <div className="px-4 py-2">After</div>
      </div>
      <div className="divide-y divide-slate-900/60">
        {keys.map((key) => {
          const beforeVal = fmtValue(before[key]);
          const afterVal = fmtValue(after[key]);
          const changed = beforeVal !== afterVal;
          return (
            <div key={key} className="grid grid-cols-2 text-xs">
              <div className={`px-4 py-2.5 border-r border-slate-900/60 font-mono truncate ${changed ? 'text-rose-300 bg-rose-500/5' : 'text-slate-500'}`}>
                <span className="text-[9px] text-slate-600 block uppercase tracking-wider">{key}</span>
                {beforeVal}
              </div>
              <div className={`px-4 py-2.5 font-mono truncate ${changed ? 'text-emerald-300 bg-emerald-500/5' : 'text-slate-500'}`}>
                <span className="text-[9px] text-slate-600 block uppercase tracking-wider">{key}</span>
                {afterVal}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
