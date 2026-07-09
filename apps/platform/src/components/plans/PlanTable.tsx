'use client';

import { useRouter } from 'next/navigation';
import { Copy, Archive, PlayCircle, MoreHorizontal, Star } from 'lucide-react';
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

export default function PlanTable({ plans, canWrite, onDuplicate, onArchive, onActivate }: Props) {
  const router = useRouter();

  return (
    <div className="hidden md:block bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-hidden">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <th className="px-4 py-3">Plan Name</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Organizations</th>
            <th className="px-4 py-3">Price</th>
            <th className="px-4 py-3">Billing Cycle</th>
            <th className="px-4 py-3">Visibility</th>
            <th className="px-4 py-3">Updated</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((plan) => (
            <tr
              key={plan.id}
              onClick={() => router.push(`/commercial/plans/${plan.id}`)}
              className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/30 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-100">{plan.name}</span>
                  {plan.isDefault && <Star size={11} className="text-amber-400" fill="currentColor" />}
                  {plan.badge && (
                    <span className="text-[9px] font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-full">
                      {plan.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-600">{plan.internalCode}</span>
              </td>
              <td className="px-4 py-3"><PlanStatusBadge status={plan.status} /></td>
              <td className="px-4 py-3 text-xs font-semibold text-slate-300">{plan.organizationCount ?? 0}</td>
              <td className="px-4 py-3 text-xs font-bold text-slate-100">{formatPriceWithCycle(plan.price, plan.currency, plan.billingCycle)}</td>
              <td className="px-4 py-3 text-xs text-slate-400">{BILLING_CYCLE_LABEL[plan.billingCycle]}</td>
              <td className="px-4 py-3"><PlanVisibilityBadge visibility={plan.visibility} /></td>
              <td className="px-4 py-3 text-xs text-slate-500">{new Date(plan.updatedAt).toLocaleDateString()}</td>
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                {canWrite ? (
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onDuplicate(plan)}
                      title="Duplicate"
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-300 transition-colors"
                    >
                      <Copy size={13} />
                    </button>
                    {plan.status === 'ARCHIVED' || plan.status === 'DRAFT' ? (
                      <button
                        onClick={() => onActivate(plan)}
                        title="Activate"
                        className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500/30 text-slate-400 hover:text-emerald-300 transition-colors"
                      >
                        <PlayCircle size={13} />
                      </button>
                    ) : (
                      <button
                        onClick={() => onArchive(plan)}
                        title="Archive"
                        className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 transition-colors"
                      >
                        <Archive size={13} />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex justify-end text-slate-700">
                    <MoreHorizontal size={14} />
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
