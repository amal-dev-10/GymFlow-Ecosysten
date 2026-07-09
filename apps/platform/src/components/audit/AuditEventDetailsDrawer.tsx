'use client';

import { useEffect, useState } from 'react';
import { X, GitBranch, Copy, Check } from 'lucide-react';
import { platformAuditApi } from '@/lib/api';
import type { AuditEventDetailDTO } from '@/types/audit';
import { SeverityBadge, StatusBadge, CategoryPill, DeviceIcon, getCategoryIcon } from './AuditBadges';
import AuditDiffViewer from './AuditDiffViewer';

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString();
}

function Field({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">{label}</span>
      <span className={`text-xs text-slate-200 break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function CopyableId({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">{label}</span>
      <button
        onClick={() => {
          navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="flex items-center gap-1.5 text-xs text-slate-200 font-mono hover:text-indigo-300 transition-colors"
      >
        {value.slice(0, 8)}...{value.slice(-4)}
        {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} className="text-slate-600" />}
      </button>
    </div>
  );
}

export default function AuditEventDetailsDrawer({ eventId, onClose, onSelectRelated }: { eventId: string; onClose: () => void; onSelectRelated: (id: string) => void }) {
  const [event, setEvent] = useState<AuditEventDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    platformAuditApi.getDetails(eventId).then(setEvent).catch(() => setEvent(null)).finally(() => setLoading(false));
  }, [eventId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const metadata = (event?.metadata || {}) as { before?: Record<string, unknown>; after?: Record<string, unknown>; apiEndpoint?: string; actorRole?: string };
  const Icon = event ? getCategoryIcon(event.eventCategory) : null;

  return (
    <div className="fixed inset-0 z-[90] flex justify-end">
      <div className="fixed inset-0 bg-[#07090e]/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg h-full bg-[#0b101d] border-l border-slate-800 flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between p-5 border-b border-slate-850 shrink-0">
          <h3 className="text-sm font-extrabold text-white">Event Details</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-6">
          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-slate-900/60 rounded-xl animate-pulse" />)}</div>
          ) : !event ? (
            <p className="text-xs text-slate-500 text-center py-10">Event not found.</p>
          ) : (
            <>
              <div className="flex items-start gap-3">
                {Icon && (
                  <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-300 shrink-0">
                    <Icon size={18} />
                  </div>
                )}
                <div className="min-w-0">
                  <span className="text-sm font-bold text-slate-100 block">{event.action}</span>
                  <span className="text-xs text-slate-500 block mt-0.5">{event.details}</span>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <CategoryPill category={event.eventCategory} />
                    <SeverityBadge severity={event.severity} />
                    <StatusBadge status={event.status} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Timestamp" value={fmtDateTime(event.createdAt)} />
                <Field label="Performed By" value={event.user} />
                <Field label="Role" value={metadata.actorRole} />
                <Field label="Organization" value={event.organization?.name} />
                <Field label="Affected Resource" value={event.entityType ? `${event.entityType}${event.entityId ? ` #${event.entityId.slice(0, 8)}` : ''}` : undefined} mono />
                <Field label="Event Type" value={event.eventType} mono />
              </div>

              {(metadata.before || metadata.after) && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">What Changed</p>
                  <AuditDiffViewer before={metadata.before || {}} after={metadata.after || {}} />
                </div>
              )}

              <div className="pt-4 border-t border-slate-900/60 space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Request Context</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="IP Address" value={event.ipAddress} mono />
                  <Field label="Country" value={event.country} />
                  <Field label="Browser" value={event.browser} />
                  <Field label="Operating System" value={event.os} />
                  <Field
                    label="Device"
                    value={
                      <span className="inline-flex items-center gap-1.5">
                        <DeviceIcon device={event.device} /> {event.device}
                      </span>
                    }
                  />
                  <Field label="API Endpoint" value={metadata.apiEndpoint} mono />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {event.requestId && <CopyableId label="Request ID" value={event.requestId} />}
                  {event.correlationId && <CopyableId label="Correlation ID" value={event.correlationId} />}
                </div>
              </div>

              {event.relatedEvents.length > 0 && (
                <div className="pt-4 border-t border-slate-900/60">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                    <GitBranch size={11} /> Related Events ({event.relatedEvents.length})
                  </p>
                  <div className="space-y-1.5">
                    {event.relatedEvents.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => onSelectRelated(r.id)}
                        className="w-full flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-900/40 border border-slate-850 hover:border-indigo-500/30 transition-colors text-left"
                      >
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-200 block truncate">{r.action}</span>
                          <span className="text-[10px] text-slate-600">{fmtDateTime(r.createdAt)}</span>
                        </div>
                        <SeverityBadge severity={r.severity} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
