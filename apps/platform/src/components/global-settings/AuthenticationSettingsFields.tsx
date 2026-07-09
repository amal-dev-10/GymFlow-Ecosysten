'use client';

import { FieldGrid, NumberField, ToggleField, InfoNote } from './SettingsFieldKit';
import type { CategoryValues } from '@/types/globalSettings';

export default function AuthenticationSettingsFields({ values, setValue, canEdit }: { values: CategoryValues; setValue: (k: string, v: any) => void; canEdit: boolean }) {
  return (
    <div className="space-y-4">
      <InfoNote>Login Attempts and Account Lock Duration are enforced live by the login flow. Session Timeout sets the default for newly created admin users. MFA Requirement and Password Policy are recorded here but not yet enforced.</InfoNote>
      <FieldGrid>
        <NumberField label="Session Timeout (minutes)" value={values.sessionTimeoutMinutes} onChange={(v) => setValue('sessionTimeoutMinutes', v)} disabled={!canEdit} min={5} />
        <NumberField label="Login Attempts" value={values.loginAttemptThreshold} onChange={(v) => setValue('loginAttemptThreshold', v)} disabled={!canEdit} min={1} />
        <NumberField label="Account Lock Duration (minutes)" value={values.accountLockDurationMinutes} onChange={(v) => setValue('accountLockDurationMinutes', v)} disabled={!canEdit} min={1} />
        <NumberField label="Password Minimum Length" value={values.passwordMinLength} onChange={(v) => setValue('passwordMinLength', v)} disabled={!canEdit} min={4} />
      </FieldGrid>
      <ToggleField label="MFA Requirement" hint="Require multi-factor authentication for all platform admins." value={!!values.mfaRequired} onChange={(v) => setValue('mfaRequired', v)} disabled={!canEdit} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ToggleField label="Require Symbol" value={!!values.passwordRequireSymbol} onChange={(v) => setValue('passwordRequireSymbol', v)} disabled={!canEdit} />
        <ToggleField label="Require Number" value={!!values.passwordRequireNumber} onChange={(v) => setValue('passwordRequireNumber', v)} disabled={!canEdit} />
        <ToggleField label="Require Uppercase" value={!!values.passwordRequireUppercase} onChange={(v) => setValue('passwordRequireUppercase', v)} disabled={!canEdit} />
      </div>
    </div>
  );
}
