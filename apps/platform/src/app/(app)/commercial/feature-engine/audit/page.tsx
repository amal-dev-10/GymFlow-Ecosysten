'use client';

import { useEffect, useState } from 'react';
import { History, ChevronLeft, ChevronRight } from 'lucide-react';
import PlatformPageHeader from '@/components/platform/PlatformPageHeader';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';
import FeatureEngineTabs from '@/components/feature-engine/FeatureEngineTabs';
import { featureEngineApi, handleApiError } from '@/lib/api';
import type { EngineAuditLogPageDTO } from '@/types/featureEngine';

const ENTITY_TYPE_OPTIONS = [
  { value: '', label: 'All Entity Types' },
  { value: 'FeatureDefinition', label: 'Feature Changed' },
  { value: 'PlanFeatureAccess', label: 'Feature Access Changed' },
  { value: 'ResourceDefinition', label: 'Limit Resource Changed' },
  { value: 'PlanResourceLimit', label: 'Limit / Validation Rule Changed' },
  { value: 'FeatureDependency', label: 'Feature Dependency Changed' },
  { value: 'EngineOverride', label: 'Override Added / Removed' },
  { value: 'OrganizationSubscription', label: 'Plan Mapping / Experience Updated' },
];

const selectClass =
  'bg-[#0b101d] border border-slate-800/80 hover:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none transition-colors cursor-pointer';

export default function FeatureEngineAuditPage() {
  const [page, setPage] = useState<EngineAuditLogPageDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [entityType, setEntityType] = useState('');
  const [pageNum, setPageNum] = useState(1);

  useEffect(() => {
    setLoading(true);
    featureEngineApi
      .getAuditLog({ entityType: entityType || undefined, page: pageNum, limit: 20 })
      .then(setPage)
      .catch((err) => setErrorMsg(handleApiError(err)))
      .finally(() => setLoading(false));
  }, [entityType, pageNum]);

  return (
    <div className="space-y-6">
      <PlatformPageHeader title="Audit History" description="Every feature, limit, override and validation rule change made through the Feature & Limit Engine." />
      <FeatureEngineTabs />

      <select
        className={selectClass}
        value={entityType}
        onChange={(e) => {
          setEntityType(e.target.value);
          setPageNum(1);
        }}
      >
        {ENTITY_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {errorMsg && <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">{errorMsg}</div>}

      {loading || !page ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />)}</div>
      ) : page.data.length === 0 ? (
        <PlatformEmptyState icon={History} title="No engine activity yet" description="Changes to features, limits, overrides and validation rules will show up here." />
      ) : (
        <>
          <div className="space-y-2">
            {page.data.map((log) => (
              <div key={log.id} className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-slate-100">{log.action}</span>
                  <span className="text-[10px] text-slate-600 shrink-0">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">{log.details}</p>
                <p className="text-[10px] text-slate-600 mt-1">By {log.user}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Page {page.page} of {page.totalPages || 1} · {page.total} events</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPageNum((p) => Math.max(1, p - 1))}
                disabled={page.page <= 1}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-300 transition-colors disabled:opacity-30"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPageNum((p) => p + 1)}
                disabled={page.page >= page.totalPages}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-300 transition-colors disabled:opacity-30"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
