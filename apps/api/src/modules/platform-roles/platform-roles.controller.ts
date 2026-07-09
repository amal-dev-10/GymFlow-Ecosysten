import { Controller, Get, Post, Put, Delete, Param, Body, Query, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { PlatformRolesService } from './platform-roles.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../platform-plans/guards/platform-admin.guard';
import { RequirePlatformRoles } from '../platform-plans/decorators/require-platform-roles.decorator';
import { PlatformPermissionGuard } from './guards/platform-permission.guard';
import { RequirePlatformPermission } from './decorators/require-platform-permission.decorator';
import { ListRolesDto } from './dto/list-roles.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { SetPermissionsDto, SetGroupsDto } from './dto/set-permissions.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { GrantTemporaryAccessDto } from './dto/grant-temporary-access.dto';

// Spec: "Only Super Administrators can manage roles." Mutations stay gated by
// the proven legacy guard to avoid a bootstrap paradox (the new engine gating
// access to the tool that configures the new engine). Reads are gated by the
// new PlatformPermissionGuard as the framework's live demonstration.
@Controller('v1/platform/roles')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformRolesController {
  constructor(private readonly service: PlatformRolesService) {}

  // --- READ (new framework: gated by permission key, not role name) ---

  @UseGuards(PlatformPermissionGuard)
  @RequirePlatformPermission('roles.view')
  @Get('dashboard')
  getDashboard() {
    return this.service.getDashboard();
  }

  @UseGuards(PlatformPermissionGuard)
  @RequirePlatformPermission('roles.view')
  @Get('matrix')
  getMatrix() {
    return this.service.getMatrix();
  }

  @UseGuards(PlatformPermissionGuard)
  @RequirePlatformPermission('roles.view')
  @Get('assignments')
  listAssignments(@Query() query: { search?: string; page?: number; limit?: number }) {
    return this.service.listAssignments(query);
  }

  @UseGuards(PlatformPermissionGuard)
  @RequirePlatformPermission('roles.view')
  @Get('temporary-access')
  listTemporaryAccess(@Query() query: { status?: string; page?: number; limit?: number }) {
    return this.service.listTemporaryAccess(query);
  }

  @UseGuards(PlatformPermissionGuard)
  @RequirePlatformPermission('audit_logs.view')
  @Get('audit')
  getAuditHistory(@Query() query: { search?: string; eventType?: string; page?: number; limit?: number }) {
    return this.service.getAuditHistory(query);
  }

  @UseGuards(PlatformPermissionGuard)
  @RequirePlatformPermission('roles.view')
  @Get('users/:platformUserId/effective-permissions')
  getUserEffectivePermissions(@Param('platformUserId') platformUserId: string) {
    return this.service.getUserEffectivePermissions(platformUserId);
  }

  @UseGuards(PlatformPermissionGuard)
  @RequirePlatformPermission('roles.view')
  @Get()
  list(@Query() query: ListRolesDto) {
    return this.service.list(query);
  }

  @UseGuards(PlatformPermissionGuard)
  @RequirePlatformPermission('roles.view')
  @Get(':id')
  getDetails(@Param('id') id: string) {
    return this.service.getDetails(id);
  }

  @UseGuards(PlatformPermissionGuard)
  @RequirePlatformPermission('roles.view')
  @Get(':id/effective-permissions')
  getEffectivePermissions(@Param('id') id: string) {
    return this.service.getEffectivePermissions(id);
  }

  // --- WRITE (legacy Super Administrator gate, per spec) ---

  @RequirePlatformRoles('SUPER_ADMIN')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req, @Body() dto: CreateRoleDto) {
    return this.service.create(dto, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN')
  @Put(':id')
  update(@Param('id') id: string, @Req() req, @Body() dto: UpdateRoleDto) {
    return this.service.update(id, dto, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.service.remove(id, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN')
  @Put(':id/permissions')
  setPermissions(@Param('id') id: string, @Req() req, @Body() dto: SetPermissionsDto) {
    return this.service.setPermissions(id, dto, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN')
  @Put(':id/groups')
  setGroups(@Param('id') id: string, @Req() req, @Body() dto: SetGroupsDto) {
    return this.service.setGroups(id, dto, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN')
  @Post(':id/inheritance/:inheritsRoleId')
  addInheritance(@Param('id') id: string, @Param('inheritsRoleId') inheritsRoleId: string, @Req() req) {
    return this.service.addInheritance(id, inheritsRoleId, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN')
  @Delete(':id/inheritance/:inheritsRoleId')
  removeInheritance(@Param('id') id: string, @Param('inheritsRoleId') inheritsRoleId: string, @Req() req) {
    return this.service.removeInheritance(id, inheritsRoleId, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN')
  @Post(':id/assign')
  @HttpCode(HttpStatus.CREATED)
  assign(@Param('id') id: string, @Req() req, @Body() dto: AssignRoleDto) {
    return this.service.assign(id, dto, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN')
  @Delete(':id/assign/:platformUserId')
  unassign(@Param('id') id: string, @Param('platformUserId') platformUserId: string, @Req() req) {
    return this.service.unassign(id, platformUserId, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN')
  @Post('temporary-access')
  @HttpCode(HttpStatus.CREATED)
  grantTemporaryAccess(@Req() req, @Body() dto: GrantTemporaryAccessDto) {
    return this.service.grantTemporaryAccess(dto, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN')
  @Post('temporary-access/:id/revoke')
  revokeTemporaryAccess(@Param('id') id: string, @Req() req) {
    return this.service.revokeTemporaryAccess(id, req.user.userId);
  }
}
