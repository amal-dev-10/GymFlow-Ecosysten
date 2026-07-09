'use client';

import { FieldGrid, NumberField, InfoNote } from './SettingsFieldKit';
import type { CategoryValues } from '@/types/globalSettings';

// Backs PLT-018's Automation & Jobs > Settings tab via the same generic
// CategorySettingsPanel used everywhere in Global Settings - this category
// has no dedicated tab in this page's own tab strip (GlobalSettingsTabs.tsx)
// since it's edited from the Automation module directly; the data still
// round-trips through the one shared PlatformSetting store/version history.
export default function AutomationSettingsFields({ values, setValue, canEdit }: { values: CategoryValues; setValue: (k: string, v: any) => void; canEdit: boolean }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Retry Policy</p>
        <NumberField label="Max Retry Attempts" value={values.retryMaxAttempts} onChange={(v) => setValue('retryMaxAttempts', v)} disabled={!canEdit} min={0} />
      </div>

      <FieldGrid>
        <NumberField label="Timeout (seconds)" value={values.timeoutSeconds} onChange={(v) => setValue('timeoutSeconds', v)} disabled={!canEdit} min={1} />
        <NumberField label="Concurrency Limit" value={values.concurrencyLimit} onChange={(v) => setValue('concurrencyLimit', v)} disabled={!canEdit} min={1} />
      </FieldGrid>

      <NumberField label="Queue Limit (per queue)" value={values.queueLimitPerQueue} onChange={(v) => setValue('queueLimitPerQueue', v)} disabled={!canEdit} min={1} />

      <InfoNote>Retry, timeout, concurrency and queue limits are stored policy only - not enforced against a live execution pipeline, since no real job runner (BullMQ, Redis, RabbitMQ, Kafka, etc.) is connected in this build.</InfoNote>
    </div>
  );
}
