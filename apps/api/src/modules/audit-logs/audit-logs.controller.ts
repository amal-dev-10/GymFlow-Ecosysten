import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { TenantGuard } from '../../core/guards/tenant.guard';
import { PermissionsGuard } from '../../core/guards/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';

// TenantGuard is required here, not optional: without it, any authenticated
// user could read (and even revoke sessions for) another organization's
// audit logs just by sending a different x-organization-id header, since
// nothing else here verifies the caller actually belongs to that org.
@Controller('v1/organizations/audit-logs')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @RequirePermissions({ resource: 'audit', action: 'view' })
  @Get()
  getLogs(
    @Req() req,
    @Query('searchQuery') searchQuery?: string,
    @Query('eventCategory') eventCategory?: string,
    @Query('eventType') eventType?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('device') device?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditLogsService.getLogs(req.organizationId, {
      searchQuery,
      eventCategory,
      eventType,
      status,
      startDate,
      endDate,
      device,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @RequirePermissions({ resource: 'audit', action: 'view' })
  @Get('stats')
  getStats(@Req() req) {
    return this.auditLogsService.getStats(req.organizationId);
  }

  @RequirePermissions({ resource: 'audit', action: 'view' })
  @Get('sessions')
  getSessions(@Req() req) {
    return this.auditLogsService.getSessions(req.organizationId);
  }

  @RequirePermissions({ resource: 'audit', action: 'view' })
  @Get('security-warnings')
  getSecurityWarnings(@Req() req, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.auditLogsService.getSecurityWarnings(
      req.organizationId,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @RequirePermissions({ resource: 'auth', action: 'manage_sessions' })
  @Post('sessions/:id/revoke')
  revokeSession(@Req() req, @Param('id') sessionId: string) {
    const actorUser = req.user?.phoneNumber || 'Administrator';
    return this.auditLogsService.revokeSession(req.organizationId, sessionId, actorUser);
  }
}
