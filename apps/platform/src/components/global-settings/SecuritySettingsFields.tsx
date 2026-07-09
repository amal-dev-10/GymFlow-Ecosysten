'use client';

import { NumberField, TagListField, ToggleField, InfoNote } from './SettingsFieldKit';
import type { CategoryValues } from '@/types/globalSettings';

export default function SecuritySettingsFields({ values, setValue, canEdit }: { values: CategoryValues; setValue: (k: string, v: any) => void; canEdit: boolean }) {
  return (
    <div className="space-y-4">
      <InfoNote>These settings are stored, versioned and audited, but not yet enforced at the request-handling layer - CORS, IP whitelisting and rate limiting are still governed by the API's own bootstrap configuration.</InfoNote>
      <TagListField label="IP Whitelist" value={values.ipWhitelist} onChange={(v) => setValue('ipWhitelist', v)} disabled={!canEdit} placeholder="Add IP or CIDR range" />
      <TagListField label="CORS Origins" value={values.corsOrigins} onChange={(v) => setValue('corsOrigins', v)} disabled={!canEdit} placeholder="Add allowed origin (e.g. https://app.gymflow.io)" />
      <NumberField label="API Rate Limit (requests/minute)" value={values.apiRateLimitPerMinute} onChange={(v) => setValue('apiRateLimitPerMinute', v)} disabled={!canEdit} min={1} />
      <ToggleField label="Security Headers" hint="Send hardened security headers (HSTS, X-Frame-Options, etc.) on API responses." value={!!values.securityHeadersEnabled} onChange={(v) => setValue('securityHeadersEnabled', v)} disabled={!canEdit} />
    </div>
  );
}
