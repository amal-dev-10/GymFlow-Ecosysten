import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSIONS_KEY = 'require_permissions';

export interface PermissionRequirements {
  resource: string;
  action: string;
}

export const RequirePermissions = (...permissions: PermissionRequirements[]) =>
  SetMetadata(REQUIRE_PERMISSIONS_KEY, permissions);
