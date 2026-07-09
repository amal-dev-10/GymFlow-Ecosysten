import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DatabaseService } from '../database/database.service';
import { REQUIRE_PERMISSIONS_KEY, PermissionRequirements } from '../decorators/require-permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<PermissionRequirements[]>(
      REQUIRE_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No permissions required
    }

    const request = context.switchToHttp().getRequest();
    const orgUser = request.orgUser; // Populated by TenantGuard

    if (!orgUser) {
      throw new ForbiddenException('User context missing (did you forget TenantGuard?)');
    }

    // Fetch all roles assigned to this user in this org
    const userWithRoles = await this.prisma.organizationUser.findUnique({
      where: { id: orgUser.id },
      include: { roles: true },
    });

    const roleIds = [orgUser.roleId, ...(userWithRoles?.roles || []).map(r => r.id)];
    const uniqueRoleIds = Array.from(new Set(roleIds));

    // Fetch user permissions for their role in this org
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId: { in: uniqueRoleIds } },
      include: { permission: true },
    });

    const userPermissions = rolePermissions.map(rp => rp.permission);

    // Check if user has ALL required permissions
    const hasAllRequired = requiredPermissions.every(req =>
      userPermissions.some(up => up.resource === req.resource && up.action === req.action),
    );

    if (!hasAllRequired) {
      throw new ForbiddenException('Insufficient permissions for this action');
    }

    return true;
  }
}
