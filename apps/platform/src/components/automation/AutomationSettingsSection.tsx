'use client';

import CategorySettingsPanel from '@/components/global-settings/CategorySettingsPanel';
import AutomationSettingsFields from '@/components/global-settings/AutomationSettingsFields';

// Reuses PLT-015's own CategorySettingsPanel + the shared AutomationSettingsFields
// component against the 'automation' Global Settings category - same real
// save/version-history/audit machinery as every other settings category,
// exactly like PLT-014's Notifications Center > Settings tab.
export default function AutomationSettingsSection({ canManage, showToast }: { canManage: boolean; showToast: (m: string, t?: 'success' | 'error') => void }) {
  return (
    <CategorySettingsPanel category="automation" canEdit={canManage} showToast={showToast}>
      {(values, setValue, editable) => <AutomationSettingsFields values={values} setValue={setValue} canEdit={editable} />}
    </CategorySettingsPanel>
  );
}
