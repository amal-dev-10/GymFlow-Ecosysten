'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PlatformPageHeader from '@/components/platform/PlatformPageHeader';
import PlanForm from '@/components/plans/PlanForm';
import { platformPlansApi, handleApiError } from '@/lib/api';
import type { ResourceDefinitionDTO, FeatureDefinitionDTO, PlanDTO, PlanFormInput } from '@/types/plans';

export default function CreatePlanPage() {
  const router = useRouter();
  const [resourceCatalog, setResourceCatalog] = useState<ResourceDefinitionDTO[]>([]);
  const [featureCatalog, setFeatureCatalog] = useState<FeatureDefinitionDTO[]>([]);
  const [otherPlans, setOtherPlans] = useState<PlanDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    Promise.all([platformPlansApi.getResourceCatalog(), platformPlansApi.getFeatureCatalog(), platformPlansApi.list()])
      .then(([resources, features, plans]) => {
        setResourceCatalog(resources);
        setFeatureCatalog(features);
        setOtherPlans(plans);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (payload: PlanFormInput) => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      const created = await platformPlansApi.create(payload);
      router.push(`/commercial/plans/${created.id}`);
    } catch (err) {
      setErrorMsg(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PlatformPageHeader
        title="Create Plan"
        description="Define resource limits, feature access, pricing, and rules for a new subscription plan."
      />
      {loading ? (
        <div className="h-64 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />
      ) : (
        <PlanForm
          mode="create"
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
