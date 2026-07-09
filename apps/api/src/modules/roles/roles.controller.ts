import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { TenantGuard } from '../../core/guards/tenant.guard';
import { PermissionsGuard } from '../../core/guards/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';

// Every route requires an authenticated user who is an active member of the
// organization named in the x-organization-id header (TenantGuard). Mutating
// role-management routes additionally require the `auth.manage_roles`
// permission. Broadly-consumed reads (the role list that powers the app-wide
// permission context, the employee lookup, and the generic audit-log writer)
// intentionally require no extra permission so any org member can use them.
@Controller('v1/roles')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // ── Static routes first (NestJS matches in order) ─────────────────────────

  // No @RequirePermissions: the role list feeds the client-side permission
  // context (access-control.tsx) for every workspace user regardless of role.
  @Get()
  getRoles(@Req() req) {
    return this.rolesService.getRoles(req.organizationId);
  }

  @RequirePermissions({ resource: 'auth', action: 'manage_roles' })
  @Get('stats')
  getStats(@Req() req) {
    return this.rolesService.getStats(req.organizationId);
  }

  @RequirePermissions({ resource: 'audit', action: 'view' })
  @Get('audit-logs')
  getAuditLogs(@Req() req, @Query('eventCategory') eventCategory?: string) {
    return this.rolesService.getAuditLogs(req.organizationId, eventCategory);
  }

  @RequirePermissions({ resource: 'audit', action: 'view' })
  @Get('security-logs')
  getSecurityLogs(@Req() req, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.rolesService.getSecurityLogs(
      req.organizationId,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  // No @RequirePermissions: generic audit-log writer invoked app-wide (e.g.
  // access-control and attendance) so users can record their own actions.
  @Post('audit-logs')
  createAuditLog(
    @Req() req,
    @Body() body: { action: string; details: string; user?: string; eventType?: string; eventCategory?: string; metadata?: any },
  ) {
    return this.rolesService.createAuditLog(
      req.organizationId,
      body.action,
      body.details,
      body.user,
      body.eventType,
      body.eventCategory,
      body.metadata,
    );
  }

  // No @RequirePermissions: employee lookup used by the dashboard and the
  // member-create flow, not just the roles admin screen.
  @Get('employees')
  getAssignableEmployees(@Req() req) {
    return this.rolesService.getAssignableEmployees(req.organizationId);
  }

  /**
   * Force re-sync all system role permissions from the canonical definition.
   * Use this after updating SYSTEM_ROLE_DEFINITIONS to propagate changes.
   */
  @RequirePermissions({ resource: 'auth', action: 'manage_roles' })
  @Post('sync-defaults')
  @HttpCode(HttpStatus.OK)
  syncDefaultRoles() {
    return this.rolesService.syncSystemRoles();
  }

  // ── Dynamic :id routes below ───────────────────────────────────────────────

  @RequirePermissions({ resource: 'auth', action: 'manage_roles' })
  @Get(':id')
  getRole(@Req() req, @Param('id') id: string) {
    return this.rolesService.getRole(req.organizationId, id);
  }

  @RequirePermissions({ resource: 'auth', action: 'manage_roles' })
  @Post()
  createRole(@Req() req, @Body() dto: CreateRoleDto) {
    return this.rolesService.createRole(req.organizationId, dto, req.user?.userId);
  }

  @RequirePermissions({ resource: 'auth', action: 'manage_roles' })
  @Put(':id')
  updateRole(@Req() req, @Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.updateRole(req.organizationId, id, dto, req.user?.userId);
  }

  @RequirePermissions({ resource: 'auth', action: 'manage_roles' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteRole(@Req() req, @Param('id') id: string) {
    return this.rolesService.deleteRole(req.organizationId, id, req.user?.userId);
  }

  @RequirePermissions({ resource: 'auth', action: 'manage_roles' })
  @Post(':id/assign')
  assignUsers(
    @Req() req,
    @Param('id') id: string,
    @Body('employeeIds') employeeIds: string[],
  ) {
    if (!employeeIds || !Array.isArray(employeeIds)) {
      throw new BadRequestException('employeeIds array is required in request body');
    }
    return this.rolesService.assignUsersToRole(req.organizationId, id, employeeIds, req.user?.userId);
  }

  @RequirePermissions({ resource: 'auth', action: 'manage_roles' })
  @Post('users/:employeeId/revoke')
  revokeUser(@Req() req, @Param('employeeId') employeeId: string) {
    return this.rolesService.removeUserFromRole(req.organizationId, employeeId, req.user?.userId);
  }
}
