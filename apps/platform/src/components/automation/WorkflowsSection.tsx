'use client';

import JobList from './JobList';

// Workflows are Jobs with a non-null workflowType - a filtered view over the
// same AutomationJob table, not a second entity (mirrors PLT-014's
// Notifications/Delivery-Logs sharing one table).
export default function WorkflowsSection({ canManage, canRun, showToast }: { canManage: boolean; canRun: boolean; showToast: (m: string, t?: 'success' | 'error') => void }) {
  return <JobList mode="workflows" canManage={canManage} canRun={canRun} showToast={showToast} />;
}
