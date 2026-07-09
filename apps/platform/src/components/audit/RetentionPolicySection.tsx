'use client';

import { useEffect, useState } from 'react';
import { Archive, Save } from 'lucide-react';
import { platformAuditApi, handleApiError } from '@/lib/api';
import type { AuditRetentionSettingDTO } from '@/types/audit';

const OPTIONS: { label: string; days: number | null }[] = [
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
  { label: '180 Days', days: 180 },
  { label: '1 Year', days: 365 },
  { label: 'Unlimited', days: null },
];

export default function RetentionPolicySection({ canManage, showToast }: { canManage: boolean; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [setting, setSetting] = useState<AuditRetentionSettingDTO | null>(null);
  const [days, setDays] = useState<number | null>(90);
  const [archiveEnabled, setArchiveEnabled] = useState(false);
  const [preview, setPreview] = useState<{ affectedCount: number; cutoff: string | null } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    platformAuditApi.getRetentionSetting().then((s) => {
      setSetting(s);
      setDays(s.defaultRetentionDays);
      setArchiveEnabled(s.archiveEnabled);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    platformAuditApi.previewRetention(days).then(setPreview).catch(() => setPreview(null));
  }, [days]);

  const save = async () => {
    setBusy(true);
    try {
      const updated = await platformAuditApi.updateRetentionSetting({ defaultRetentionDays: days, archiveEnabled });
      setSetting(updated);
      showToast('Retention policy updated.');
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
        <p className="text-xs text-slate-300">
          Audit events are immutable - this configures how long they&apos;re retained for active queries. No automatic deletion runs against this setting; use the preview below to see the real impact before deciding.
        </p>
      </div>

      <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-5 space-y-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Default Retention Period</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {OPTIONS.map((o) => (
              <button
                key={o.label}
                disabled={!canManage}
                onClick={() => setDays(o.days)}
                className={`py-2.5 rounded-xl text-xs font-bold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${days === o.days ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' : 'bg-slate-900/40 border-slate-850 text-slate-400 hover:border-slate-700'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-900/60">
          <div>
            <span className="text-xs font-bold text-slate-200 block">Archive Instead of Delete</span>
            <span className="text-[11px] text-slate-500">When enabled, events past retention are flagged for archival rather than removal.</span>
          </div>
          <button
            disabled={!canManage}
            onClick={() => setArchiveEnabled((v) => !v)}
            className={`w-11 h-6 rounded-full transition-colors relative shrink-0 disabled:opacity-50 ${archiveEnabled ? 'bg-indigo-500' : 'bg-slate-800'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${archiveEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {preview && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-900/40 border border-slate-850">
            <Archive size={14} className="text-slate-500 shrink-0" />
            <span className="text-xs text-slate-400">
              {days == null ? 'No events will be affected - retention is Unlimited.' : (
                <>
                  <b className="text-slate-200">{preview.affectedCount}</b> event{preview.affectedCount === 1 ? '' : 's'} older than {days} days would be affected right now.
                </>
              )}
            </span>
          </div>
        )}

        {canManage && (
          <button onClick={save} disabled={busy} className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40">
            <Save size={14} /> {busy ? 'Saving...' : 'Save Retention Policy'}
          </button>
        )}

        {setting?.updatedByName && (
          <p className="text-[10px] text-slate-600">Last updated by {setting.updatedByName} on {new Date(setting.updatedAt).toLocaleString()}.</p>
        )}
      </div>
    </div>
  );
}
