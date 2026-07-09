'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, Bell, ShieldCheck } from 'lucide-react';
import { platformAuditApi, handleApiError } from '@/lib/api';
import type { AuditCategoryDTO } from '@/types/audit';
import AlertsSection from './AlertsSection';

interface Props {
  canManage: boolean;
  showToast: (m: string, t?: 'success' | 'error') => void;
  alertsView: boolean;
  onOpenAlerts: () => void;
  onCloseAlerts: () => void;
}

export default function SettingsSection({ canManage, showToast, alertsView, onOpenAlerts, onCloseAlerts }: Props) {
  const [categories, setCategories] = useState<AuditCategoryDTO[] | null>(null);

  const load = () => {
    platformAuditApi.listCategories().then(setCategories).catch(() => setCategories([]));
  };

  useEffect(() => {
    load();
  }, []);

  if (alertsView) {
    return (
      <div className="space-y-4">
        <button onClick={onCloseAlerts} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors">
          <ChevronLeft size={13} /> Back to Settings
        </button>
        <AlertsSection canManage={canManage} showToast={showToast} />
      </div>
    );
  }

  const toggle = async (cat: AuditCategoryDTO) => {
    if (cat.order === 999) return; // legacy, not catalog-backed
    try {
      await platformAuditApi.setCategoryEnabled(cat.key, !cat.isEnabled);
      load();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <button onClick={onOpenAlerts} className="w-full flex items-center justify-between p-4 bg-[#0b101d] border border-slate-800/80 hover:border-indigo-500/30 rounded-2xl transition-colors text-left">
        <span className="flex items-center gap-2.5">
          <Bell size={16} className="text-indigo-400" />
          <span>
            <span className="text-xs font-bold text-slate-200 block">Alerts</span>
            <span className="text-[11px] text-slate-500">Configure alert rules for critical events, failed payments and security risks.</span>
          </span>
        </span>
        <ChevronLeft size={14} className="text-slate-600 rotate-180" />
      </button>

      <div>
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">
          <ShieldCheck size={11} /> Event Categories
        </p>
        <p className="text-xs text-slate-500 mb-3">
          Enabling or disabling a category controls whether it appears in filters and views here - it does not stop the source module from writing events.
        </p>
        {!categories ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-[#0b101d] border border-slate-800/80 rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {categories.map((c) => (
              <div key={c.key} className="flex items-center justify-between p-3 rounded-xl bg-[#0b101d] border border-slate-800/80">
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-200 block truncate">{c.label}</span>
                  {c.description && <span className="text-[10px] text-slate-600 block truncate">{c.description}</span>}
                </div>
                <button
                  disabled={!canManage || c.order === 999}
                  onClick={() => toggle(c)}
                  className={`w-9 h-5 rounded-full transition-colors relative shrink-0 disabled:opacity-40 ${c.isEnabled ? 'bg-indigo-500' : 'bg-slate-800'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${c.isEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
