'use client';

interface Props {
  label: string;
  used: number;
  limitValue: number | null;
  unit?: string | null;
  unlimited?: boolean;
  disabled?: boolean;
  warning?: boolean;
}

export default function UsageBar({ label, used, limitValue, unit, unlimited, disabled, warning }: Props) {
  const pct = unlimited || disabled || !limitValue ? null : Math.min(100, Math.round((used / limitValue) * 100));
  const exceeded = pct !== null && pct >= 100;
  const barColor = exceeded ? 'bg-rose-500' : warning ? 'bg-amber-400' : 'bg-indigo-500';

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-slate-300">{label}</span>
        <span className={`text-xs font-bold ${exceeded ? 'text-rose-400' : warning ? 'text-amber-400' : 'text-slate-200'}`}>
          {disabled ? 'Disabled' : unlimited ? `${used}${unit ? ` ${unit}` : ''} / Unlimited` : `${used} / ${limitValue}${unit ? ` ${unit}` : ''}`}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-900 border border-slate-850 overflow-hidden">
        {!disabled && (
          <div
            className={`h-full rounded-full transition-all ${unlimited ? 'bg-emerald-500' : barColor}`}
            style={{ width: unlimited ? '100%' : `${pct ?? 0}%` }}
          />
        )}
      </div>
    </div>
  );
}
