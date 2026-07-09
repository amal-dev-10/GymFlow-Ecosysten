'use client';

import { FieldGrid, SelectField, ToggleField, NumberField, TextField, InfoNote } from './SettingsFieldKit';
import type { CategoryValues } from '@/types/globalSettings';

const EMAIL_PROVIDERS = [{ value: 'none', label: 'Not configured' }, { value: 'sendgrid', label: 'SendGrid' }, { value: 'ses', label: 'Amazon SES' }];
const SMS_PROVIDERS = [{ value: 'none', label: 'Not configured' }, { value: 'twilio', label: 'Twilio' }, { value: 'msg91', label: 'MSG91' }];

// Shared by both this page (Global Settings > Notifications) and PLT-014's
// Notifications Center > Settings tab - single source of truth for provider/
// retry/rate-limit/quiet-hours policy, reused via CategorySettingsPanel in
// both places rather than duplicated.
export default function NotificationsSettingsFields({ values, setValue, canEdit }: { values: CategoryValues; setValue: (k: string, v: any) => void; canEdit: boolean }) {
  return (
    <div className="space-y-4">
      <FieldGrid>
        <SelectField label="Email Provider" value={values.emailProvider} onChange={(v) => setValue('emailProvider', v)} disabled={!canEdit} options={EMAIL_PROVIDERS} />
        <SelectField label="SMS Provider" value={values.smsProvider} onChange={(v) => setValue('smsProvider', v)} disabled={!canEdit} options={SMS_PROVIDERS} />
      </FieldGrid>
      <ToggleField label="Push Notifications" hint="Enable push notification delivery for mobile apps." value={!!values.pushEnabled} onChange={(v) => setValue('pushEnabled', v)} disabled={!canEdit} />
      <ToggleField label="WhatsApp (Future)" hint="Reserved for a future WhatsApp Business integration." value={!!values.whatsappEnabled} onChange={(v) => setValue('whatsappEnabled', v)} disabled={!canEdit} />
      <InfoNote>Provider selections are recorded configuration only - no email/SMS/push/WhatsApp delivery integration is connected in this build.</InfoNote>

      <div className="pt-2 border-t border-slate-900/60">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Retry Policy</p>
        <FieldGrid>
          <NumberField label="Max Retry Attempts" value={values.retryMaxAttempts} onChange={(v) => setValue('retryMaxAttempts', v)} disabled={!canEdit} min={0} />
          <NumberField label="Retry Delay (seconds)" value={values.retryDelaySeconds} onChange={(v) => setValue('retryDelaySeconds', v)} disabled={!canEdit} min={0} />
        </FieldGrid>
      </div>

      <div className="pt-2 border-t border-slate-900/60">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Rate Limits</p>
        <FieldGrid>
          <NumberField label="Sends Per Minute" value={values.rateLimitPerMinute} onChange={(v) => setValue('rateLimitPerMinute', v)} disabled={!canEdit} min={1} />
          <NumberField label="Sends Per Hour" value={values.rateLimitPerHour} onChange={(v) => setValue('rateLimitPerHour', v)} disabled={!canEdit} min={1} />
        </FieldGrid>
      </div>

      <div className="pt-2 border-t border-slate-900/60 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Quiet Hours</p>
        <ToggleField label="Quiet Hours" hint="Avoid sending non-urgent notifications during this window." value={!!values.quietHoursEnabled} onChange={(v) => setValue('quietHoursEnabled', v)} disabled={!canEdit} />
        {values.quietHoursEnabled && (
          <FieldGrid>
            <TextField label="Start Time" value={values.quietHoursStart} onChange={(v) => setValue('quietHoursStart', v)} disabled={!canEdit} placeholder="22:00" />
            <TextField label="End Time" value={values.quietHoursEnd} onChange={(v) => setValue('quietHoursEnd', v)} disabled={!canEdit} placeholder="08:00" />
          </FieldGrid>
        )}
        <InfoNote>Rate limits and quiet hours are stored policy only - not enforced against a live send pipeline, since no real provider integration exists yet.</InfoNote>
      </div>
    </div>
  );
}
