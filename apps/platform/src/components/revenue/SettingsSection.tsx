'use client';

import { useEffect, useState } from 'react';
import { Webhook, CreditCard, Wallet, Package, Citrus, Receipt } from 'lucide-react';
import { platformRevenueApi } from '@/lib/api';
import type { PaymentGatewayDTO } from '@/types/revenue';
import OrgBillingLookup from './OrgBillingLookup';

const ICON_MAP: Record<string, typeof CreditCard> = { CreditCard, Wallet, Package, Citrus, Receipt };

export default function SettingsSection({ canManage, showToast }: { canManage: boolean; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [gateways, setGateways] = useState<PaymentGatewayDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    platformRevenueApi.listGateways().then(setGateways).catch(() => setGateways([])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggle = async (g: PaymentGatewayDTO) => {
    setSavingKey(g.key);
    try {
      await platformRevenueApi.updateGateway(g.key, !g.isActive);
      showToast(`${g.label} ${!g.isActive ? 'enabled' : 'disabled'}.`);
      load();
    } catch {
      showToast('Failed to update gateway.', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200 mb-3"><Webhook size={13} className="text-indigo-400" /> Payment Gateways</span>
        <p className="text-[11px] text-slate-500 mb-3">A future gateway integration is a new catalog row here, not a UI change - enable/disable which gateways are considered active for reporting.</p>

        {loading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-slate-900/40 rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="space-y-2">
            {gateways.map((g) => {
              const Icon = ICON_MAP[g.icon || ''] || CreditCard;
              return (
                <div key={g.key} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-900/40 border border-slate-850">
                  <span className="flex items-center gap-2 text-xs font-semibold text-slate-200"><Icon size={14} className="text-slate-500" /> {g.label}</span>
                  {canManage ? (
                    <button
                      disabled={savingKey === g.key}
                      onClick={() => toggle(g)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-colors disabled:opacity-40 ${g.isActive ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-slate-800/60 border-slate-700/60 text-slate-500'}`}
                    >
                      {g.isActive ? 'Active' : 'Inactive'}
                    </button>
                  ) : (
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${g.isActive ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-slate-800/60 border-slate-700/60 text-slate-500'}`}>
                      {g.isActive ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <OrgBillingLookup />
    </div>
  );
}
