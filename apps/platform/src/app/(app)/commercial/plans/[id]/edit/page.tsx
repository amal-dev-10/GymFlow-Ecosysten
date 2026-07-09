'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PlatformPageHeader from '@/components/platform/PlatformPageHeader';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';
import PlanForm from '@/components/plans/PlanForm';
import { platformPlansApi, handleApiError } from '@/lib/api';
import type { ResourceDefinitionDTO, FeatureDefinitionDTO, PlanDTO, PlanFormInput } from '@/types/plans';

export default function EditPlanPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [plan, setPlan] = useState<PlanDTO | null>(null);
  const [resourceCatalog, setResourceCatalog] = useState<ResourceDefinitionDTO[]>([]);
  const [featureCatalog, setFeatureCatalog] = useState<FeatureDefinitionDTO[]>([]);
  const [otherPlans, setOtherPlans] = useState<PlanDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    Promise.all([
      platformPlansApi.get(id),
      platformPlansApi.getResourceCatalog(),
      platformPlansApi.getFeatureCatalog(),
      platformPlansApi.list(),
    ])
      .then(([planData, resources, features, plans]) => {
        setPlan(planData);
        setResourceCatalog(resources);
        setFeatureCatalog(features);
        setOtherPlans(plans.filter((p) => p.id !== id));
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (payload: PlanFormInput) => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      await platformPlansApi.update(id, payload);
      router.push(`/commercial/plans/${id}`);
    } catch (err) {
      setErrorMsg(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PlatformPageHeader title="Edit Plan" description={plan ? `Editing "${plan.name}"` : 'Loading plan configuration...'} />
      {loading ? (
        <div className="h-64 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />
      ) : notFound || !plan ? (
        <PlatformEmptyState title="Plan not found" description="This plan may have been removed." />
      ) : (
        <PlanForm
          mode="edit"
          initialPlan={plan}
          resourceCatalog={resourceCatalog}
          featureCatalog={featureCatalog}
          otherPlans={otherPlans}
          onSubmit={handleSubmit}
          submitting={submitting}
          errorMsg={errorMsg}
        />
      )}
    </div>
  );
}
