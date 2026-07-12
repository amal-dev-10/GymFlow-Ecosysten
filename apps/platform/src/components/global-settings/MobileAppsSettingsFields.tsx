'use client';

import { FieldGrid, TextField, TextAreaField, ToggleField, InfoNote } from './SettingsFieldKit';
import type { CategoryValues } from '@/types/globalSettings';

export default function MobileAppsSettingsFields({ values, setValue, canEdit }: { values: CategoryValues; setValue: (k: string, v: any) => void; canEdit: boolean }) {
  return (
    <div className="space-y-4">
      <InfoNote>Consumed live by mobile clients via the public GET /v1/platform/settings-public/mobile-version-check endpoint - Force Update and Maintenance Mode are real data a client can act on, not just stored config.</InfoNote>
      <FieldGrid>
        <TextField label="Android Latest Version" value={values.androidLatestVersion} onChange={(v) => setValue('androidLatestVersion', v)} disabled={!canEdit} />
        <TextField label="iOS Latest Version" value={values.iosLatestVersion} onChange={(v) => setValue('iosLatestVersion', v)} disabled={!canEdit} />
        <TextField label="Minimum Supported Version" value={values.minimumSupportedVersion} onChange={(v) => setValue('minimumSupportedVersion', v)} disabled={!canEdit} />
        <TextField label="Play Store URL" value={values.playStoreUrl} onChange={(v) => setValue('playStoreUrl', v)} disabled={!canEdit} />
        <TextField label="App Store URL" value={values.appStoreUrl} onChange={(v) => setValue('appStoreUrl', v)} disabled={!canEdit} />
      </FieldGrid>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ToggleField label="Force Update" hint="Require users on unsupported versions to update before continuing." value={!!values.forceUpdate} onChange={(v) => setValue('forceUpdate', v)} disabled={!canEdit} />
        <ToggleField label="Maintenance Mode" hint="Signal to mobile clients that the platform is under maintenance." value={!!values.maintenanceMode} onChange={(v) => setValue('maintenanceMode', v)} disabled={!canEdit} />
      </div>
      {values.maintenanceMode && (
        <TextAreaField label="Maintenance Message" value={values.maintenanceMessage} onChange={(v) => setValue('maintenanceMessage', v)} disabled={!canEdit} rows={2} />
      )}
      <TextAreaField label="Release Notes" value={values.releaseNotes} onChange={(v) => setValue('releaseNotes', v)} disabled={!canEdit} rows={3} />

      <div className="pt-4 mt-2 border-t border-neutral-200/70">
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">Landing Page — “Get the App” Section</h4>
        <InfoNote>Controls the public marketing site&apos;s app-download section (GET /v1/platform/settings-public/mobile-app). The Play Store / App Store URLs above are the download links used here.</InfoNote>
        <div className="space-y-4 mt-4">
          <ToggleField label="Show on Landing Page" hint="Display the app-download section on the public marketing site." value={values.landingEnabled !== false} onChange={(v) => setValue('landingEnabled', v)} disabled={!canEdit} />
          <TextField label="Headline" value={values.landingHeadline} onChange={(v) => setValue('landingHeadline', v)} disabled={!canEdit} />
          <TextAreaField label="Subtitle" value={values.landingSubtitle} onChange={(v) => setValue('landingSubtitle', v)} disabled={!canEdit} rows={2} />
          <TextAreaField label="Feature Highlights (one per line)" value={values.landingFeatures} onChange={(v) => setValue('landingFeatures', v)} disabled={!canEdit} rows={4} />
        </div>
      </div>
    </div>
  );
}
