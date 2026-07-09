'use client';

import { FieldGrid, SelectField, TextField } from './SettingsFieldKit';
import type { CategoryValues } from '@/types/globalSettings';

const TIMEZONES = ['UTC', 'America/New_York', 'America/Los_Angeles', 'America/Chicago', 'Europe/London', 'Europe/Berlin', 'Asia/Kolkata', 'Asia/Singapore', 'Australia/Sydney'];
const DATE_FORMATS = ['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY', 'DD MMM YYYY'];
const TIME_FORMATS = [{ value: '12h', label: '12-hour' }, { value: '24h', label: '24-hour' }];

export default function GeneralSettingsFields({ values, setValue, canEdit }: { values: CategoryValues; setValue: (k: string, v: any) => void; canEdit: boolean }) {
  return (
    <div className="space-y-4">
      <FieldGrid>
        <TextField label="Platform Name" value={values.platformName} onChange={(v) => setValue('platformName', v)} disabled={!canEdit} />
        <TextField label="Website" value={values.website} onChange={(v) => setValue('website', v)} disabled={!canEdit} placeholder="https://" />
        <TextField label="Support Email" value={values.supportEmail} onChange={(v) => setValue('supportEmail', v)} disabled={!canEdit} />
        <TextField label="Support Phone" value={values.supportPhone} onChange={(v) => setValue('supportPhone', v)} disabled={!canEdit} />
        <SelectField label="Timezone" value={values.timezone} onChange={(v) => setValue('timezone', v)} disabled={!canEdit} options={TIMEZONES.map((t) => ({ value: t, label: t }))} />
        <SelectField label="Date Format" value={values.dateFormat} onChange={(v) => setValue('dateFormat', v)} disabled={!canEdit} options={DATE_FORMATS.map((f) => ({ value: f, label: f }))} />
        <SelectField label="Time Format" value={values.timeFormat} onChange={(v) => setValue('timeFormat', v)} disabled={!canEdit} options={TIME_FORMATS} />
      </FieldGrid>
    </div>
  );
}
