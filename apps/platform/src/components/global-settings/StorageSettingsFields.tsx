'use client';

import { FieldGrid, NumberField, TagListField } from './SettingsFieldKit';
import type { CategoryValues } from '@/types/globalSettings';

export default function StorageSettingsFields({ values, setValue, canEdit }: { values: CategoryValues; setValue: (k: string, v: any) => void; canEdit: boolean }) {
  return (
    <div className="space-y-4">
      <FieldGrid>
        <NumberField label="Default Storage Limit (MB)" value={values.defaultStorageLimitMb} onChange={(v) => setValue('defaultStorageLimitMb', v)} disabled={!canEdit} min={0} />
        <NumberField label="Max Upload Size (MB)" value={values.maxUploadSizeMb} onChange={(v) => setValue('maxUploadSizeMb', v)} disabled={!canEdit} min={1} />
      </FieldGrid>
      <TagListField label="Allowed File Types" value={values.allowedFileTypes} onChange={(v) => setValue('allowedFileTypes', v)} disabled={!canEdit} placeholder="Add MIME type (e.g. image/png)" />
    </div>
  );
}
