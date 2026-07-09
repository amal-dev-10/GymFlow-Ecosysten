'use client';

import { FieldGrid, SelectField, TextField, InfoNote } from './SettingsFieldKit';
import type { CategoryValues } from '@/types/globalSettings';

const PROVIDERS = [{ value: 'none', label: 'Not configured' }, { value: 'sendgrid', label: 'SendGrid' }, { value: 'ses', label: 'Amazon SES' }, { value: 'postmark', label: 'Postmark' }, { value: 'mailgun', label: 'Mailgun' }];

export default function EmailSettingsFields({ values, setValue, canEdit }: { values: CategoryValues; setValue: (k: string, v: any) => void; canEdit: boolean }) {
  return (
    <div className="space-y-4">
      <SelectField label="Email Provider" value={values.provider} onChange={(v) => setValue('provider', v)} disabled={!canEdit} options={PROVIDERS} />
      <FieldGrid>
        <TextField label="From Name" value={values.fromName} onChange={(v) => setValue('fromName', v)} disabled={!canEdit} />
        <TextField label="From Address" value={values.fromAddress} onChange={(v) => setValue('fromAddress', v)} disabled={!canEdit} />
        <TextField label="Reply-To Address" value={values.replyToAddress} onChange={(v) => setValue('replyToAddress', v)} disabled={!canEdit} />
      </FieldGrid>
      <InfoNote>Selecting a provider here records the platform's intended email configuration. No provider SDK is connected yet - a future integration is a new value here, not a UI change.</InfoNote>
    </div>
  );
}
