import { Controller, Get, Post, Put, Delete, Param, Body, Query, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { PlatformUsersService } from './platform-users.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../platform-plans/guards/platform-admin.guard';
import { RequirePlatformRoles } from '../platform-plans/decorators/require-platform-roles.decorator';
import { ListPlatformUsersDto } from './dto/list-platform-users.dto';
import { InvitePlatformUserDto } from './dto/invite-platform-user.dto';
import { UpdatePlatformUserDto } from './dto/update-platform-user.dto';
import { SuspendPlatformUserDto } from './dto/suspend-platform-user.dto';
import { BulkPlatformUserActionDto } from './dto/bulk-platform-user-action.dto';
import { AssignOrganizationDto } from './dto/assign-organization.dto';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';

const MANAGE_ROLES = ['SUPER_ADMIN', 'OPERATIONS'] as const;

@Controller('v1/platform/users')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformUsersController {
  constructor(private readonly service: PlatformUsersService) {}

  // --- READ ---

  @Get('stats')
  getStats() {
    return this.service.getStats();
  }

  @Get('departments/breakdown')
  getDepartmentBreakdown() {
    return this.service.listDepartmentBreakdown();
  }

  @Get('departments')
  listDepartments() {
    return this.service.listDepartments();
  }

  @Get()
  list(@Query() query: ListPlatformUsersDto) {
    return this.service.list(query);
  }

  @Get(':id')
  getProfile(@Param('id') id: string) {
    return this.service.getProfile(id);
  }

  // --- INVITE / LIFECYCLE ---

  @RequirePlatformRoles(...MANAGE_ROLES)
  @Post('invite')
  @HttpCode(HttpStatus.CREATED)
  invite(@Req() req, @Body() dto: InvitePlatformUserDto) {
    return this.service.invite(dto, req.user.userId);
  }

  @RequirePlatformRoles(...MANAGE_ROLES)
  @Post(':id/resend-invitation')
  @HttpCode(HttpStatus.OK)
  resendInvitation(@Param('id') id: string, @Req() req) {
    return this.service.resendInvitation(id, req.user.userId);
  }

  @RequirePlatformRoles(...MANAGE_ROLES)
  @Post(':id/cancel-invitation')
  @HttpCode(HttpStatus.OK)
  cancelInvitation(@Param('id') id: string, @Req() req) {
    return this.service.cancelInvitation(id, req.user.userId);
  }

  @RequirePlatformRoles(...MANAGE_ROLES)
  @Put(':id')
  update(@Param('id') id: string, @Req() req, @Body() dto: UpdatePlatformUserDto) {
    return this.service.update(id, dto, req.user.userId);
  }

  @RequirePlatformRoles(...MANAGE_ROLES)
  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Param('id') id: string, @Req() req) {
    return this.service.resetPassword(id, req.user.userId);
  }

  @RequirePlatformRoles(...MANAGE_ROLES)
  @Post(':id/reset-mfa')
  @HttpCode(HttpStatus.OK)
  resetMfa(@Param('id') id: string, @Req() req) {
    return this.service.resetMfa(id, req.user.userId);
  }

  @RequirePlatformRoles(...MANAGE_ROLES)
  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  suspend(@Param('id') id: string, @Req() req, @Body() dto: SuspendPlatformUserDto) {
    return this.service.suspend(id, dto, req.user.userId);
  }

  @RequirePlatformRoles(...MANAGE_ROLES)
  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  activate(@Param('id') id: string, @Req() req) {
    return this.service.activate(id, req.user.userId);
  }

  @RequirePlatformRoles(...MANAGE_ROLES)
  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  deactivate(@Param('id') id: string, @Req() req) {
    return this.service.deactivate(id, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN')
  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  archive(@Param('id') id: string, @Req() req) {
    return this.service.archive(id, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN')
  @Post(':id/unlock')
  @HttpCode(HttpStatus.OK)
  unlock(@Param('id') id: string, @Req() req) {
    return this.service.unlock(id, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.service.remove(id, req.user.userId);
  }

  // --- BULK / EXPORT ---

  @RequirePlatformRoles(...MANAGE_ROLES)
  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  bulk(@Req() req, @Body() dto: BulkPlatformUserActionDto) {
    return this.service.bulk(dto, req.user.userId);
  }

  @Post('export')
  @HttpCode(HttpStatus.OK)
  recordExport(@Req() req, @Body() body: { format?: string; count?: number }) {
    return this.service.recordExport(req.user.userId, body?.format || 'csv', body?.count || 0);
  }

  // --- SESSIONS ---

  @RequirePlatformRoles(...MANAGE_ROLES)
  @Post(':id/sessions/:sessionId/terminate')
  @HttpCode(HttpStatus.OK)
  terminateSession(@Param('id') id: string, @Param('sessionId') sessionId: string, @Req() req) {
    return this.service.terminateSession(id, sessionId, req.user.userId);
  }

  @RequirePlatformRoles(...MANAGE_ROLES)
  @Post(':id/sessions/terminate-all')
  @HttpCode(HttpStatus.OK)
  terminateAllSessions(@Param('id') id: string, @Req() req) {
    return this.service.terminateAllSessions(id, req.user.userId);
  }

  // --- ASSIGNED ORGANIZATIONS ---

  @RequirePlatformRoles(...MANAGE_ROLES)
  @Post(':id/organizations')
  @HttpCode(HttpStatus.CREATED)
  assignOrganization(@Param('id') id: string, @Req() req, @Body() dto: AssignOrganizationDto) {
    return this.service.assignOrganization(id, dto, req.user.userId);
  }

  @RequirePlatformRoles(...MANAGE_ROLES)
  @Delete(':id/organizations/:assignmentId')
  removeOrganizationAssignment(@Param('id') id: string, @Param('assignmentId') assignmentId: string, @Req() req) {
    return this.service.removeOrganizationAssignment(id, assignmentId, req.user.userId);
  }

  // --- DEPARTMENTS (management) ---

  @RequirePlatformRoles(...MANAGE_ROLES)
  @Post('departments')
  @HttpCode(HttpStatus.CREATED)
  createDepartment(@Req() req, @Body() dto: CreateDepartmentDto) {
    return this.service.createDepartment(dto.name, dto.description, req.user.userId);
  }

  @RequirePlatformRoles(...MANAGE_ROLES)
  @Put('departments/:deptId')
  updateDepartment(@Param('deptId') deptId: string, @Req() req, @Body() dto: UpdateDepartmentDto) {
    return this.service.updateDepartment(deptId, dto.description, req.user.userId);
  }

  @RequirePlatformRoles(...MANAGE_ROLES)
  @Delete('departments/:deptId')
  deleteDepartment(@Param('deptId') deptId: string, @Req() req) {
    return this.service.deleteDepartment(deptId, req.user.userId);
  }
}
