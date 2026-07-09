'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function PermissionJsonViewer({ data }: { data: unknown }) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(data, null, 2);

  const copy = () => {
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="relative bg-[#07090e] border border-slate-800/80 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-900/60">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">JSON</span>
        <button onClick={copy} className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-300 transition-colors">
          {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 text-[11px] font-mono text-slate-400 overflow-auto max-h-96 leading-relaxed">{json}</pre>
    </div>
  );
}
