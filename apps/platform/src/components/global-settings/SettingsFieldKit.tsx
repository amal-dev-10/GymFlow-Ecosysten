'use client';

import { useState } from 'react';
import { Info, Plus, X } from 'lucide-react';

const inputClass = 'w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none disabled:opacity-50 disabled:cursor-not-allowed';
const selectClass = inputClass + ' cursor-pointer';
const labelClass = 'block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5';

export function FieldWrap({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
      {hint && <p className="text-[10px] text-slate-600 mt-1">{hint}</p>}
    </div>
  );
}

export function TextField({ label, value, onChange, disabled, placeholder, hint }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean; placeholder?: string; hint?: string }) {
  return (
    <FieldWrap label={label} hint={hint}>
      <input value={value ?? ''} onChange={(e) => onChange(e.target.value)} disabled={disabled} placeholder={placeholder} className={inputClass} />
    </FieldWrap>
  );
}

export function TextAreaField({ label, value, onChange, disabled, hint, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean; hint?: string; rows?: number }) {
  return (
    <FieldWrap label={label} hint={hint}>
      <textarea value={value ?? ''} onChange={(e) => onChange(e.target.value)} disabled={disabled} rows={rows} className={inputClass + ' resize-none'} />
    </FieldWrap>
  );
}

export function NumberField({ label, value, onChange, disabled, hint, min }: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean; hint?: string; min?: number }) {
  return (
    <FieldWrap label={label} hint={hint}>
      <input type="number" min={min} value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} disabled={disabled} className={inputClass} />
    </FieldWrap>
  );
}

export function SelectField({ label, value, onChange, disabled, options, hint }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean; options: { value: string; label: string }[]; hint?: string }) {
  return (
    <FieldWrap label={label} hint={hint}>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={selectClass}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </FieldWrap>
  );
}

export function ToggleField({ label, value, onChange, disabled, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-slate-900/40 border border-slate-850">
      <div>
        <span className="text-xs font-semibold text-slate-200">{label}</span>
        {hint && <p className="text-[10px] text-slate-600 mt-0.5">{hint}</p>}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={`shrink-0 relative w-9 h-5 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${value ? 'bg-indigo-500' : 'bg-slate-800'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${value ? 'translate-x-4' : ''}`} />
      </button>
    </div>
  );
}

export function ColorField({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <FieldWrap label={label}>
      <div className="flex items-center gap-2">
        <input type="color" value={value || '#6366f1'} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="w-9 h-9 rounded-lg border border-slate-800 bg-transparent cursor-pointer disabled:cursor-not-allowed" />
        <input value={value ?? ''} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={inputClass} />
      </div>
    </FieldWrap>
  );
}

export function TagListField({ label, value, onChange, disabled, hint, placeholder }: { label: string; value: string[]; onChange: (v: string[]) => void; disabled?: boolean; hint?: string; placeholder?: string }) {
  const [draft, setDraft] = useState('');
  const list = value || [];

  const add = () => {
    const v = draft.trim();
    if (!v || list.includes(v)) return;
    onChange([...list, v]);
    setDraft('');
  };

  return (
    <FieldWrap label={label} hint={hint}>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {list.map((tag) => (
          <span key={tag} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-300">
            {tag}
            {!disabled && (
              <button type="button" onClick={() => onChange(list.filter((t) => t !== tag))} className="text-slate-600 hover:text-rose-400">
                <X size={11} />
              </button>
            )}
          </span>
        ))}
        {list.length === 0 && <span className="text-[11px] text-slate-700">None set.</span>}
      </div>
      {!disabled && (
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
            placeholder={placeholder}
            className={inputClass}
          />
          <button type="button" onClick={add} className="shrink-0 flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/15">
            <Plus size={14} />
          </button>
        </div>
      )}
    </FieldWrap>
  );
}

export function ToggleMapField({ label, value, onChange, disabled, hint }: { label: string; value: Record<string, boolean>; onChange: (v: Record<string, boolean>) => void; disabled?: boolean; hint?: string }) {
  const [draft, setDraft] = useState('');
  const entries = Object.entries(value || {});

  const add = () => {
    const key = draft.trim();
    if (!key || key in (value || {})) return;
    onChange({ ...(value || {}), [key]: false });
    setDraft('');
  };

  return (
    <FieldWrap label={label} hint={hint}>
      <div className="space-y-2 mb-2">
        {entries.length === 0 && <span className="text-[11px] text-slate-700">No feature toggles defined.</span>}
        {entries.map(([key, enabled]) => (
          <div key={key} className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/40 border border-slate-850">
            <span className="text-xs font-mono text-slate-300">{key}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange({ ...value, [key]: !enabled })}
                className={`relative w-9 h-5 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${enabled ? 'bg-indigo-500' : 'bg-slate-800'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${enabled ? 'translate-x-4' : ''}`} />
              </button>
              {!disabled && (
                <button type="button" onClick={() => { const next = { ...value }; delete next[key]; onChange(next); }} className="text-slate-600 hover:text-rose-400">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {!disabled && (
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
            placeholder="Add toggle key (e.g. betaFeatureX)"
            className={inputClass}
          />
          <button type="button" onClick={add} className="shrink-0 flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/15">
            <Plus size={14} />
          </button>
        </div>
      )}
    </FieldWrap>
  );
}

export function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-500/5 border border-amber-500/15">
      <Info size={13} className="text-amber-400 shrink-0 mt-0.5" />
      <p className="text-[11px] text-amber-200/80 leading-relaxed">{children}</p>
    </div>
  );
}

export function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}
