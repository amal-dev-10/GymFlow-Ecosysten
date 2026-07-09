'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, GitCompare } from 'lucide-react';
import PlatformPageHeader from '@/components/platform/PlatformPageHeader';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';
import PlanComparisonTable from '@/components/plans/PlanComparisonTable';
import { platformPlansApi } from '@/lib/api';
import type { PlanDTO } from '@/types/plans';

const MAX_COMPARE = 4;

export default function ComparePlansPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idsParam = searchParams.get('ids') || '';
  const selectedIds = idsParam ? idsParam.split(',').filter(Boolean) : [];

  const [allPlans, setAllPlans] = useState<PlanDTO[]>([]);
  const [comparedPlans, setComparedPlans] = useState<PlanDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    platformPlansApi.list().then(setAllPlans).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedIds.length === 0) {
      setComparedPlans([]);
      return;
    }
    setLoadingDetails(true);
    Promise.all(selectedIds.map((id) => platformPlansApi.get(id)))
      .then(setComparedPlans)
      .catch(() => setComparedPlans([]))
      .finally(() => setLoadingDetails(false));
  }, [idsParam]);

  const toggleSelection = (planId: string) => {
    const set = new Set(selectedIds);
    if (set.has(planId)) {
      set.delete(planId);
    } else {
      if (set.size >= MAX_COMPARE) return;
      set.add(planId);
    }
    const next = Array.from(set);
    router.replace(next.length ? `/commercial/plans/compare?ids=${next.join(',')}` : '/commercial/plans/compare');
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push('/commercial/plans')}
        className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowLeft size={13} />
        Back to Plans
      </button>

      <PlatformPageHeader title="Plan Comparison" description="Compare features, limits, pricing, and visibility side-by-side." />

      {loading ? (
        <div className="h-16 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />
      ) : allPlans.length === 0 ? (
        <PlatformEmptyState icon={GitCompare} title="No plans to compare" description="Create at least two plans first." />
      ) : (
        <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 block mb-2">Select up to {MAX_COMPARE} plans</span>
          <div className="flex flex-wrap gap-2">
            {allPlans.map((plan) => {
              const selected = selectedIds.includes(plan.id);
              return (
                <button
                  key={plan.id}
                  onClick={() => toggleSelection(plan.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                    selected ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300' : 'border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {plan.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedIds.length < 2 ? (
        <PlatformEmptyState icon={GitCompare} title="Select at least two plans" description="Choose two or more plans above to see a side-by-side comparison." />
      ) : loadingDetails ? (
        <div className="h-64 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />
      ) : (
        <PlanComparisonTable plans={comparedPlans} />
      )}
    </div>
  );
}
