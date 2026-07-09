import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DatabaseService } from '../../../core/database/database.service';
import { PlatformAuthorizationService } from '../platform-authorization.service';
import { REQUIRE_PLATFORM_PERMISSION_KEY } from '../decorators/require-platform-permission.decorator';

/**
 * PLT-008 authorization framework primitive: evaluates a concrete permission
 * key via PlatformAuthorizationService rather than a hardcoded role name.
 * Must run after JwtAuthGuard + PlatformAdminGuard (needs request.user +
 * request.platformRole). Legacy SUPER_ADMIN enum role always passes, since
 * Super Administrator is unrestricted by definition in both systems.
 */
@Injectable()
export class PlatformPermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: DatabaseService,
    private authz: PlatformAuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredKey = this.reflector.getAllAndOverride<string>(REQUIRE_PLATFORM_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredKey) return true;

    const request = context.switchToHttp().getRequest();
    if (request.platformRole === 'SUPER_ADMIN') return true;

    const platformAdmin = await this.prisma.platformAdminUser.findUnique({ where: { userId: request.user.userId } });
    if (!platformAdmin) throw new ForbiddenException('User does not have Platform Administration access');

    const allowed = await this.authz.hasPermission(platformAdmin.id, requiredKey);
    if (!allowed) {
      throw new ForbiddenException(`This action requires the "${requiredKey}" permission.`);
    }
    return true;
  }
}
