'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';
import { platformPlansApi, handleApiError } from '@/lib/api';
import type { PlanDTO } from '@/types/plans';
import { computePlanChangeImpact } from '@/lib/planChangeImpact';
import PlanChangeImpactPanel from './PlanChangeImpactPanel';
import FeatureStateBadge from '@/components/feature-engine/FeatureStateBadge';
import LimitTypeBadge from '@/components/feature-engine/LimitTypeBadge';
import { fmtMoney } from '../shared';

type Intent = 'assign' | 'upgrade' | 'downgrade';

const STEPS = ['Choose Plan', 'Review Features', 'Review Limits', 'Pricing', 'Confirmation'];

interface Props {
  intent: Intent;
  currentPlanId: string | null;
  currency: string;
  plans: PlanDTO[];
  recommendedPlanId?: string | null;
  onClose: () => void;
  onConfirm: (planId: string) => Promise<void>;
}

export default function AssignSubscriptionWizard({ intent, currentPlanId, currency, plans, recommendedPlanId, onClose, onConfirm }: Props) {
  const [step, setStep] = useState(0);
  const [selectedId, setSelectedId] = useState<string>(recommendedPlanId || '');
  const [currentFull, setCurrentFull] = useState<PlanDTO | null>(null);
  const [targetFull, setTargetFull] = useState<PlanDTO | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const candidatePlans = useMemo(() => {
    if (!currentPlanId) return plans;
    if (intent === 'upgrade') return plans.filter((p) => p.id === currentPlanId || p.price >= (plans.find((cp) => cp.id === currentPlanId)?.price ?? 0));
    if (intent === 'downgrade') return plans.filter((p) => p.id === currentPlanId || p.price <= (plans.find((cp) => cp.id === currentPlanId)?.price ?? 0));
    return plans;
  }, [plans, currentPlanId, intent]);

  useEffect(() => {
    if (!selectedId || step === 0) return;
    setLoadingDetail(true);
    setAcknowledged(false);
    Promise.all([currentPlanId ? platformPlansApi.get(currentPlanId) : Promise.resolve(null), platformPlansApi.get(selectedId)])
      .then(([cur, target]) => {
        setCurrentFull(cur);
        setTargetFull(target);
      })
      .catch((err) => setError(handleApiError(err)))
      .finally(() => setLoadingDetail(false));
  }, [selectedId, step, currentPlanId]);

  const impact = currentFull && targetFull ? computePlanChangeImpact(currentFull, targetFull) : null;
  const selectedPlan = plans.find((p) => p.id === selectedId);

  const title = intent === 'upgrade' ? 'Upgrade Subscription' : intent === 'downgrade' ? 'Downgrade Subscription' : 'Assign Subscription';

  const canProceed = () => {
    if (step === 0) return !!selectedId;
    if ((step === 1 || step === 2) && impact?.isDowngrade) return acknowledged || !impact.warnings.length;
    return true;
  };

  const handleConfirm = async () => {
    setBusy(true);
    setError('');
    try {
      await onConfirm(selectedId);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="w-full max-w-2xl bg-[#0b101d] border border-slate-800/80 rounded-3xl shadow-2xl relative z-10 max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-850 shrink-0">
          <h3 className="text-base font-extrabold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={16} /></button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 px-5 py-3 border-b border-slate-900/60 shrink-0 overflow-x-auto scrollbar-hide">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1 shrink-0">
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold ${i === step ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' : i < step ? 'text-emerald-400' : 'text-slate-600'}`}>
                {i < step ? <Check size={11} /> : <span className="w-3.5 text-center">{i + 1}</span>}
                {s}
              </div>
              {i < STEPS.length - 1 && <ChevronRight size={12} className="text-slate-700" />}
            </div>
          ))}
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {step === 0 && (
            <div className="space-y-2">
              {candidatePlans.map((p) => {
                const isCurrent = p.id === currentPlanId;
                const isRecommended = p.id === recommendedPlanId;
                return (
                  <button
                    key={p.id}
                    disabled={isCurrent}
                    onClick={() => setSelectedId(p.id)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-colors ${
                      selectedId === p.id ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-slate-900/40 border-slate-850 hover:border-slate-700'
                    } ${isCurrent ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-100">{p.name}</span>
                        {isCurrent && <span className="text-[9px] font-bold text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded-full">CURRENT</span>}
                        {isRecommended && !isCurrent && <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">RECOMMENDED</span>}
                      </div>
                      {p.description && <p className="text-[11px] text-slate-500 mt-0.5 max-w-md">{p.description}</p>}
                    </div>
                    <span className="text-sm font-bold text-slate-200 shrink-0">{fmtMoney(p.price, p.currency)}/{p.billingCycle.toLowerCase()}</span>
                  </button>
                );
              })}
              {candidatePlans.length === 0 && <p className="text-xs text-slate-500 text-center py-6">No candidate plans available.</p>}
            </div>
          )}

          {(step === 1 || step === 2) && (
            <>
              {loadingDetail ? (
                <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-indigo-400" /></div>
              ) : impact ? (
                step === 1 ? (
                  <div className="space-y-4">
                    <PlanChangeImpactPanel impact={{ ...impact, limitsReduced: [], limitsIncreased: [] }} currency={currency} />
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">All Features on {targetFull?.name}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-56 overflow-y-auto scrollbar-thin pr-1">
                        {(targetFull?.featureAccess || []).map((f) => (
                          <div key={f.featureKey} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/40">
                            <span className="text-[11px] text-slate-300">{f.feature.label}</span>
                            <FeatureStateBadge state={f.state} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <PlanChangeImpactPanel impact={{ ...impact, featuresLost: [], featuresGained: [] }} currency={currency} />
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">All Limits on {targetFull?.name}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-56 overflow-y-auto scrollbar-thin pr-1">
                        {(targetFull?.resourceLimits || []).map((l) => (
                          <div key={l.resourceKey} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/40">
                            <span className="text-[11px] text-slate-300">{l.resource.label}</span>
                            <LimitTypeBadge limitType={l.limitType} limitValue={l.limitValue} unit={l.resource.unit} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              ) : null}

              {impact?.isDowngrade && impact.warnings.length > 0 && (
                <label className="flex items-start gap-2 mt-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 cursor-pointer">
                  <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} className="accent-amber-500 mt-0.5" />
                  <span className="text-[11px] text-amber-300">I understand this downgrade will reduce features and/or limits for this organization.</span>
                </label>
              )}
            </>
          )}

          {step === 3 && selectedPlan && currentFull && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/40 border border-slate-850">
                <span className="text-xs text-slate-400">Current plan</span>
                <span className="text-sm font-bold text-slate-300">{fmtMoney(currentFull.price, currentFull.currency)}/{currentFull.billingCycle.toLowerCase()}</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
                <span className="text-xs text-indigo-300">New plan — {selectedPlan.name}</span>
                <span className="text-sm font-bold text-indigo-200">{fmtMoney(selectedPlan.price, selectedPlan.currency)}/{selectedPlan.billingCycle.toLowerCase()}</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/40 border border-slate-850">
                <span className="text-xs text-slate-400">Price difference</span>
                <span className={`text-sm font-bold ${selectedPlan.price - currentFull.price > 0 ? 'text-emerald-400' : selectedPlan.price - currentFull.price < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                  {selectedPlan.price - currentFull.price > 0 ? '+' : ''}{fmtMoney(selectedPlan.price - currentFull.price, currency)}
                </span>
              </div>
              <p className="text-[11px] text-slate-600">Billing changes take effect immediately. Proration against the current cycle is handled by your payment provider integration.</p>
            </div>
          )}

          {step === 4 && selectedPlan && (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-300 mx-auto mb-4">
                <Check size={24} />
              </div>
              <p className="text-sm font-bold text-slate-100">Ready to {intent === 'assign' ? 'assign' : intent} to {selectedPlan.name}</p>
              <p className="text-xs text-slate-500 mt-1">{fmtMoney(selectedPlan.price, selectedPlan.currency)} / {selectedPlan.billingCycle.toLowerCase()}</p>
            </div>
          )}

          {error && <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">{error}</div>}
        </div>

        <div className="flex items-center justify-between p-5 border-t border-slate-850 shrink-0">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={13} /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              disabled={!canProceed()}
              className="flex items-center gap-1 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40"
            >
              Next <ChevronRight size={13} />
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={busy}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {busy ? 'Confirming...' : `Confirm ${intent === 'assign' ? 'Assignment' : intent === 'upgrade' ? 'Upgrade' : 'Downgrade'}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
