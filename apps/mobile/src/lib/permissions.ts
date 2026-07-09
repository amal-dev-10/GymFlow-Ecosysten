// Client-side permission derivation, mirroring the web workspace app's
// role-based `canExecuteAction`/`hasFullAccess` pattern (apps/web/.../members/[id]/page.tsx).
//
// There is no tenant-level "my effective permissions" API yet (the backend's
// /v1/auth/me only returns platform-admin permissions, not gym-staff RBAC) —
// this is a stand-in derived from a normalized role key.
//
// IMPORTANT: GET /v1/organizations returns the *raw* Role.name from the
// database (e.g. "Organization Owner", "Gym Manager", "Yoga Instructor",
// custom names an org owner typed in) — not a normalized key. The backend's
// own auth.service.ts normalizes this with substring checks (`name.includes
// ('owner')`, etc.) before putting a role on the JWT-issued user object;
// normalizeRole() below applies the exact same rule so both paths agree on
// what "owner" or "trainer" means.

export type Feature =
  | 'view-dashboard'
  | 'manage-members'
  | 'create-membership'
  | 'record-payment'
  | 'mark-attendance'
  | 'freeze-membership'
  | 'manage-staff'
  | 'manage-leads'
  | 'manage-inventory'
  | 'view-reports'
  | 'assign-workout'
  | 'assign-diet'
  | 'record-measurement';

export type NormalizedRole = 'owner' | 'branch_manager' | 'receptionist' | 'trainer' | 'dietitian' | 'custom';

export function normalizeRole(rawRoleName: string | null | undefined): NormalizedRole {
  const name = (rawRoleName || '').toLowerCase();
  if (name.includes('owner')) return 'owner';
  if (name.includes('manager')) return 'branch_manager';
  if (name.includes('receptionist')) return 'receptionist';
  if (name.includes('trainer')) return 'trainer';
  if (name.includes('dietitian')) return 'dietitian';
  return 'custom';
}

const FULL_ACCESS_ROLES: NormalizedRole[] = ['owner', 'branch_manager'];

const ROLE_FEATURES: Record<NormalizedRole, Feature[]> = {
  owner: [],
  branch_manager: [],
  receptionist: ['view-dashboard', 'manage-members', 'create-membership', 'record-payment', 'mark-attendance', 'freeze-membership'],
  trainer: ['view-dashboard', 'manage-members', 'mark-attendance', 'assign-workout', 'record-measurement'],
  dietitian: ['view-dashboard', 'manage-members', 'assign-diet', 'record-measurement'],
  // Custom/unrecognized role names (e.g. "Yoga Instructor", "Accountant"): grant
  // the safe baseline rather than nothing, since they are still active staff.
  custom: ['view-dashboard', 'manage-members', 'mark-attendance'],
};

const ALL_FEATURES: Feature[] = [
  'view-dashboard', 'manage-members', 'create-membership', 'record-payment', 'mark-attendance',
  'freeze-membership', 'manage-staff', 'manage-leads', 'manage-inventory', 'view-reports',
  'assign-workout', 'assign-diet', 'record-measurement',
];

export function permissionsForRole(rawRoleName: string | null | undefined): Feature[] {
  if (!rawRoleName) return [];
  const normalized = normalizeRole(rawRoleName);
  if (FULL_ACCESS_ROLES.includes(normalized)) return ALL_FEATURES;
  return ROLE_FEATURES[normalized];
}

export function hasFeature(rawRoleName: string | null | undefined, feature: Feature): boolean {
  return permissionsForRole(rawRoleName).includes(feature);
}
