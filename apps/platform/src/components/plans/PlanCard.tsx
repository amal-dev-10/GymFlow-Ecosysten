'use client';

import { useRouter } from 'next/navigation';
import { Copy, Archive, PlayCircle, Star, Building2, ArrowRight } from 'lucide-react';
import type { PlanDTO } from '@/types/plans';
import PlanStatusBadge from './PlanStatusBadge';
import PlanVisibilityBadge from './PlanVisibilityBadge';
import { BILLING_CYCLE_LABEL, formatPriceWithCycle } from '@/lib/planFormat';

interface Props {
  plans: PlanDTO[];
  canWrite: boolean;
  onDuplicate: (plan: PlanDTO) => void;
  onArchive: (plan: PlanDTO) => void;
  onActivate: (plan: PlanDTO) => void;
}

export default function PlanCard({ plans, canWrite, onDuplicate, onArchive, onActivate }: Props) {
  const router = useRouter();

  return (
    <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
      {plans.map((plan) => (
        <div key={plan.id} className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-slate-100">{plan.name}</span>
                {plan.isDefault && <Star size={11} className="text-amber-400" fill="currentColor" />}
              </div>
              <span className="text-[10px] text-slate-600">{plan.internalCode}</span>
            </div>
            <PlanStatusBadge status={plan.status} />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-black text-slate-100">{formatPriceWithCycle(plan.price, plan.currency, plan.billingCycle)}</span>
            <span className="text-[10px] text-slate-500">{BILLING_CYCLE_LABEL[plan.billingCycle]}</span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1"><Building2 size={12} className="text-slate-600" />{plan.organizationCount ?? 0} orgs</span>
            <PlanVisibilityBadge visibility={plan.visibility} />
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-900/60">
            <button
              onClick={() => router.push(`/commercial/plans/${plan.id}`)}
              className="flex-1 flex items-center justify-center gap-1 py-2 bg-slate-900 border border-slate-800 hover:border-indigo-500/30 rounded-xl text-[11px] font-bold text-slate-300 hover:text-indigo-300 transition-colors"
            >
              View <ArrowRight size={12} />
            </button>
            {canWrite && (
              <>
                <button
                  onClick={() => onDuplicate(plan)}
                  title="Duplicate"
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-300 transition-colors"
                >
                  <Copy size={13} />
                </button>
                {plan.status === 'ARCHIVED' || plan.status === 'DRAFT' ? (
                  <button
                    onClick={() => onActivate(plan)}
                    title="Activate"
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/30 text-slate-400 hover:text-emerald-300 transition-colors"
                  >
                    <PlayCircle size={13} />
                  </button>
                ) : (
                  <button
                    onClick={() => onArchive(plan)}
                    title="Archive"
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 transition-colors"
                  >
                    <Archive size={13} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
