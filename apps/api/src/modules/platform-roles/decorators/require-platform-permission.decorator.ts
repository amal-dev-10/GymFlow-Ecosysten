import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PLATFORM_PERMISSION_KEY = 'require_platform_permission';

/**
 * PLT-008 authorization framework primitive. Gates an endpoint by a concrete
 * permission key (e.g. "roles.view") evaluated via PlatformAuthorizationService,
 * instead of by role name. This is the pattern future modules should adopt -
 * existing @RequirePlatformRoles usage elsewhere is untouched.
 */
export const RequirePlatformPermission = (key: string) => SetMetadata(REQUIRE_PLATFORM_PERMISSION_KEY, key);
