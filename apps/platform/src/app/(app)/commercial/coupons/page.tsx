'use client';

import { useEffect, useMemo, useState } from 'react';
import { Ticket, Plus, Search, X, Layers, Ban, Trash2, CheckCircle2 } from 'lucide-react';
import PlatformPageHeader from '@/components/platform/PlatformPageHeader';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';
import { platformCouponsApi, platformPlansApi, handleApiError } from '@/lib/api';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import type { CouponDTO, CouponStatsDTO, DiscountType } from '@/types/coupons';
import type { PlanDTO } from '@/types/plans';

const inputClass = 'w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none';
const selectClass = inputClass + ' cursor-pointer';

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString() : '—';
}

function KpiCard({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">{label}</span>
      <span className={`text-xl font-black block mt-2 ${tone || 'text-slate-100'}`}>{value}</span>
    </div>
  );
}

function CreateCouponModal({ plans, onClose, onCreated, showToast }: { plans: PlanDTO[]; onClose: () => void; onCreated: () => void; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [stackable, setStackable] = useState(false);
  const [validUntil, setValidUntil] = useState('');
  const [applicablePlanIds, setApplicablePlanIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const togglePlan = (id: string) => setApplicablePlanIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  const submit = async () => {
    if (!code.trim() || !discountValue) return;
    setBusy(true);
    setError('');
    try {
      await platformCouponsApi.create({
        code: code.trim().toUpperCase(),
        description: description || undefined,
        discountType,
        discountValue: Number(discountValue),
        currency: discountType === 'FIXED' ? currency : undefined,
        maxRedemptions: maxRedemptions ? Number(maxRedemptions) : undefined,
        stackable,
        applicablePlanIds,
        validUntil: validUntil || undefined,
      });
      showToast(`Coupon "${code.toUpperCase()}" created.`);
      onCreated();
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md overflow-y-auto">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="w-full max-w-lg bg-[#0b101d] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10 my-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-extrabold text-white">Create Coupon</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={16} /></button>
        </div>
        <div className="space-y-3">
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="COUPON CODE" className={`${inputClass} font-mono uppercase`} />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Description (optional)" className={inputClass} />

          <div className="grid grid-cols-2 gap-3">
            <select value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)} className={selectClass}>
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED">Fixed Amount</option>
            </select>
            <input type="number" min={0} value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder={discountType === 'PERCENTAGE' ? '% off' : 'Amount off'} className={inputClass} />
          </div>
          {discountType === 'FIXED' && (
            <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} placeholder="Currency (e.g. USD)" className={inputClass} />
          )}

          <div className="grid grid-cols-2 gap-3">
            <input type="number" min={1} value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} placeholder="Max redemptions (optional)" className={inputClass} />
            <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={inputClass} />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={stackable} onChange={(e) => setStackable(e.target.checked)} className="accent-indigo-500" />
            <span className="text-xs text-slate-300 flex items-center gap-1"><Layers size={12} /> Stackable with other coupons</span>
          </label>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Applicable Plans (none selected = all plans)</label>
            <div className="flex flex-wrap gap-1.5">
              {plans.map((p) => (
                <button
                  key={p.id}
                  onClick={() => togglePlan(p.id)}
                  className={`px-2.5 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${applicablePlanIds.includes(p.id) ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-[11px] font-semibold text-rose-400">{error}</p>}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all">Cancel</button>
          <button onClick={submit} disabled={busy || !code.trim() || !discountValue} className="flex-1 py-3 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40">
            {busy ? 'Creating...' : 'Create Coupon'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PlatformCouponsPage() {
  const { canWrite } = usePlatformRole();
  const [coupons, setCoupons] = useState<CouponDTO[]>([]);
  const [stats, setStats] = useState<CouponStatsDTO | null>(null);
  const [plans, setPlans] = useState<PlanDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CouponDTO | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  const load = () => {
    setLoading(true);
    Promise.all([platformCouponsApi.list(), platformCouponsApi.getStats()])
      .then(([c, s]) => {
        setCoupons(c);
        setStats(s);
      })
      .catch((err) => showToast(handleApiError(err), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);
  useEffect(() => {
    platformPlansApi.list({ status: 'ACTIVE' }).then(setPlans).catch(() => setPlans([]));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return coupons;
    const q = search.toLowerCase();
    return coupons.filter((c) => c.code.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q));
  }, [coupons, search]);

  const toggleActive = async (coupon: CouponDTO) => {
    try {
      await platformCouponsApi.update(coupon.id, { isActive: !coupon.isActive });
      showToast(`Coupon "${coupon.code}" ${coupon.isActive ? 'deactivated' : 'reactivated'}.`);
      load();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await platformCouponsApi.remove(deleteTarget.id);
      showToast(`Coupon "${deleteTarget.code}" deleted.`);
      load();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const isExpired = (c: CouponDTO) => !!c.validUntil && new Date(c.validUntil) < new Date();

  return (
    <div className="space-y-6">
      <PlatformPageHeader
        title="Coupons"
        description="Discount codes and promotional offers organizations can redeem against their subscription."
        actions={
          canWrite && (
            <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors">
              <Plus size={14} />
              Create Coupon
            </button>
          )
        }
      />

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Total Coupons" value={String(stats.total)} />
          <KpiCard label="Active" value={String(stats.active)} tone="text-emerald-400" />
          <KpiCard label="Redemptions" value={String(stats.totalRedemptions)} />
          <KpiCard label="Total Discount Given" value={`$${stats.totalDiscountGiven}`} />
        </div>
      )}

      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search coupons by code or description..." className={`${inputClass} pl-9`} />
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <PlatformEmptyState icon={Ticket} title="No coupons found" description={search ? 'Try a different search term.' : 'Create your first coupon to offer discounts on subscriptions.'} />
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const expired = isExpired(c);
            return (
              <div key={c.id} className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold font-mono text-slate-100">{c.code}</span>
                    <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                      {c.discountType === 'PERCENTAGE' ? `${c.discountValue}% off` : `${c.discountValue} ${c.currency} off`}
                    </span>
                    {c.stackable && <span className="text-[9px] font-bold text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full flex items-center gap-1"><Layers size={9} /> stackable</span>}
                    {!c.isActive && <span className="text-[9px] font-bold text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">INACTIVE</span>}
                    {expired && <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">EXPIRED</span>}
                  </div>
                  {c.description && <p className="text-[11px] text-slate-500 mt-1">{c.description}</p>}
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-600">
                    <span>{c.activeRedemptions}{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ''} redemptions</span>
                    <span>Valid until {fmtDate(c.validUntil)}</span>
                    {c.applicablePlans.length > 0 && <span>Plans: {c.applicablePlans.map((p) => p.name).join(', ')}</span>}
                  </div>
                </div>
                {canWrite && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => toggleActive(c)}
                      title={c.isActive ? 'Deactivate' : 'Reactivate'}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-300 transition-colors"
                    >
                      {c.isActive ? <Ban size={13} /> : <CheckCircle2 size={13} />}
                    </button>
                    {c.activeRedemptions === 0 && (
                      <button onClick={() => setDeleteTarget(c)} title="Delete" className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {createOpen && <CreateCouponModal plans={plans} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); load(); }} showToast={showToast} />}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md">
          <div className="fixed inset-0" onClick={() => setDeleteTarget(null)} />
          <div className="w-full max-w-sm bg-[#0b101d] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10">
            <h3 className="text-base font-extrabold text-white mb-2">Delete Coupon</h3>
            <p className="text-xs text-slate-400 mb-5">
              Delete <b className="text-slate-200 font-mono">{deleteTarget.code}</b>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-3 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 text-rose-300 text-xs font-bold rounded-xl transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed top-5 right-5 z-[100] flex items-center gap-3 p-4 bg-[#0b101d]/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl max-w-sm">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span className="text-xs font-bold text-slate-100">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
