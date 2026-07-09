'use client';

const STATUS_STYLES: Record<string, string> = {
  Draft: 'bg-slate-800/60 border-slate-700/60 text-slate-400',
  Scheduled: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300',
  Queued: 'bg-sky-500/10 border-sky-500/20 text-sky-300',
  Sending: 'bg-sky-500/10 border-sky-500/20 text-sky-300',
  Sent: 'bg-slate-800/60 border-slate-700/60 text-slate-300',
  Delivered: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
  Read: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
  Failed: 'bg-rose-500/10 border-rose-500/20 text-rose-300',
  Cancelled: 'bg-slate-800/60 border-slate-700/60 text-slate-500',
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLES[status] || STATUS_STYLES.Draft}`}>{status}</span>;
}

const PRIORITY_STYLES: Record<string, string> = {
  Low: 'text-slate-500',
  Normal: 'text-slate-300',
  High: 'text-amber-400',
  Urgent: 'text-rose-400',
};

export function PriorityBadge({ priority }: { priority: string }) {
  return <span className={`text-[11px] font-bold ${PRIORITY_STYLES[priority] || PRIORITY_STYLES.Normal}`}>{priority}</span>;
}

const CHANNEL_LABELS: Record<string, string> = {
  in_app: 'In-App',
  push: 'Push',
  email: 'Email',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
};

export function ChannelBadge({ channel }: { channel: string }) {
  return <span className="px-2 py-0.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[10px] font-semibold text-slate-300">{CHANNEL_LABELS[channel] || channel}</span>;
}
