'use client';

import { ColorField, FieldGrid, TextAreaField, ToggleField } from './SettingsFieldKit';
import BrandingLogoUpload from './BrandingLogoUpload';
import type { CategoryValues } from '@/types/globalSettings';

export default function BrandingSettingsFields({
  values,
  setValue,
  canEdit,
  showToast,
}: {
  values: CategoryValues;
  setValue: (k: string, v: any) => void;
  canEdit: boolean;
  showToast: (m: string, t?: 'success' | 'error') => void;
}) {
  return (
    <div className="space-y-4">
      <FieldGrid>
        <BrandingLogoUpload label="Logo" value={values.logoUrl} onChange={(url) => setValue('logoUrl', url)} disabled={!canEdit} showToast={showToast} />
        <BrandingLogoUpload label="Favicon" value={values.faviconUrl} onChange={(url) => setValue('faviconUrl', url)} disabled={!canEdit} showToast={showToast} />
        <ColorField label="Primary Color" value={values.primaryColor} onChange={(v) => setValue('primaryColor', v)} disabled={!canEdit} />
        <ColorField label="Accent Color" value={values.accentColor} onChange={(v) => setValue('accentColor', v)} disabled={!canEdit} />
      </FieldGrid>
      <ToggleField label="Email Branding" hint="Apply platform logo and colors to transactional email templates." value={!!values.emailBrandingEnabled} onChange={(v) => setValue('emailBrandingEnabled', v)} disabled={!canEdit} />
      <TextAreaField label="Email Footer Text" value={values.emailFooterText} onChange={(v) => setValue('emailFooterText', v)} disabled={!canEdit} rows={2} />
    </div>
  );
}
