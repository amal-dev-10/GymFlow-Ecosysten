import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DatabaseService } from '../../../core/database/database.service';
import { REQUIRE_PLATFORM_ROLES_KEY, PlatformRoleName } from '../decorators/require-platform-roles.decorator';

/**
 * Gates platform-admin-only endpoints (e.g. Subscription Plan management).
 * Requires an active PlatformAdminUser row for the logged-in user - separate
 * from the tenant-scoped OrganizationUser/Role system, since platform staff
 * aren't tied to a single organization.
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User is not authenticated');
    }

    const platformAdmin = await this.prisma.platformAdminUser.findUnique({
      where: { userId: user.userId },
    });

    if (!platformAdmin) {
      throw new ForbiddenException('User does not have Platform Administration access');
    }
    if (!platformAdmin.isActive) {
      const reason: Record<string, string> = {
        PENDING_INVITATION: 'This platform account is still pending invitation acceptance.',
        SUSPENDED: 'This platform account has been suspended.',
        DISABLED: 'This platform account has been deactivated.',
        LOCKED: 'This platform account is locked due to repeated failed login attempts.',
        ARCHIVED: 'This platform account has been archived.',
      };
      throw new ForbiddenException(reason[platformAdmin.status] || 'User does not have Platform Administration access');
    }

    const requiredRoles = this.reflector.getAllAndOverride<PlatformRoleName[]>(
      REQUIRE_PLATFORM_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(platformAdmin.role as PlatformRoleName)) {
      throw new ForbiddenException(`This action requires one of the following platform roles: ${requiredRoles.join(', ')}`);
    }

    request.platformRole = platformAdmin.role;
    return true;
  }
}
