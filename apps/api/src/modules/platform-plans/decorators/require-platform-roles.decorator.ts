import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PLATFORM_ROLES_KEY = 'require_platform_roles';

export type PlatformRoleName = 'SUPER_ADMIN' | 'OPERATIONS' | 'FINANCE' | 'SALES' | 'SUPPORT' | 'DEVELOPER' | 'MARKETING' | 'CUSTOMER_SUCCESS';

/**
 * Restricts a platform-plans endpoint to specific platform staff roles.
 * If omitted, PlatformAdminGuard only requires an active PlatformAdminUser
 * of any role (used for read endpoints).
 */
export const RequirePlatformRoles = (...roles: PlatformRoleName[]) =>
  SetMetadata(REQUIRE_PLATFORM_ROLES_KEY, roles);
