'use client';

import { FieldGrid, SelectField, TagListField } from './SettingsFieldKit';
import type { CategoryValues } from '@/types/globalSettings';

const LANGUAGES = [{ value: 'en', label: 'English' }, { value: 'es', label: 'Spanish' }, { value: 'fr', label: 'French' }, { value: 'de', label: 'German' }, { value: 'hi', label: 'Hindi' }, { value: 'pt', label: 'Portuguese' }];
const COUNTRIES = [{ value: 'US', label: 'United States' }, { value: 'IN', label: 'India' }, { value: 'GB', label: 'United Kingdom' }, { value: 'CA', label: 'Canada' }, { value: 'AU', label: 'Australia' }];
const CURRENCIES = [{ value: 'USD', label: 'USD - US Dollar' }, { value: 'EUR', label: 'EUR - Euro' }, { value: 'GBP', label: 'GBP - British Pound' }, { value: 'INR', label: 'INR - Indian Rupee' }, { value: 'CAD', label: 'CAD - Canadian Dollar' }];

export default function LocalizationSettingsFields({ values, setValue, canEdit }: { values: CategoryValues; setValue: (k: string, v: any) => void; canEdit: boolean }) {
  return (
    <div className="space-y-4">
      <FieldGrid>
        <SelectField label="Default Language" value={values.defaultLanguage} onChange={(v) => setValue('defaultLanguage', v)} disabled={!canEdit} options={LANGUAGES} />
        <SelectField label="Default Country" value={values.defaultCountry} onChange={(v) => setValue('defaultCountry', v)} disabled={!canEdit} options={COUNTRIES} />
        <SelectField label="Currency" value={values.currency} onChange={(v) => setValue('currency', v)} disabled={!canEdit} options={CURRENCIES} />
      </FieldGrid>
      <TagListField label="Supported Languages" value={values.supportedLanguages} onChange={(v) => setValue('supportedLanguages', v)} disabled={!canEdit} placeholder="Add language code (e.g. en)" />
      <TagListField label="Supported Countries" value={values.supportedCountries} onChange={(v) => setValue('supportedCountries', v)} disabled={!canEdit} placeholder="Add country code (e.g. US)" />
    </div>
  );
}
