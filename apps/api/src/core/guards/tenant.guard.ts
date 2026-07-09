import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private prisma: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const organizationId = request.headers['x-organization-id'];

    if (!user) {
      throw new ForbiddenException('User is not authenticated');
    }

    if (!organizationId) {
      throw new ForbiddenException('Missing X-Organization-Id header');
    }

    // Verify user belongs to the organization and is active
    const orgUser = await this.prisma.organizationUser.findUnique({
      where: {
        userId_organizationId: {
          userId: user.userId,
          organizationId: organizationId,
        },
      },
    });

    if (!orgUser || !orgUser.isActive) {
      throw new ForbiddenException('User does not have active access to this organization');
    }

    // Attach organization context to request
    request.organizationId = organizationId;
    request.orgUser = orgUser;

    return true;
  }
}
