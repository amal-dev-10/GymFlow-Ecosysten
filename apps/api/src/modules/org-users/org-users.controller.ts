import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { OrgUsersService } from './org-users.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { AssignGymsDto } from './dto/assign-gyms.dto';
import { BulkUpdateDto } from './dto/bulk-update.dto';

import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { Req, UseGuards } from '@nestjs/common';

@Controller('v1/organizations')
export class OrgUsersController {
  constructor(private readonly orgUsersService: OrgUsersService) {}

  private getOrgId(orgHeader: string): string {
    if (!orgHeader) {
      throw new BadRequestException('x-organization-id header is required');
    }
    return orgHeader;
  }

  @UseGuards(JwtAuthGuard)
  @Get('users/stats')
  getStats(@Headers('x-organization-id') orgHeader: string) {
    const orgId = this.getOrgId(orgHeader);
    return this.orgUsersService.getStats(orgId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('users')
  getUsers(@Headers('x-organization-id') orgHeader: string) {
    const orgId = this.getOrgId(orgHeader);
    return this.orgUsersService.getUsers(orgId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('users/:userId/details')
  getUserDetails(
    @Headers('x-organization-id') orgHeader: string,
    @Param('userId') userId: string,
  ) {
    const orgId = this.getOrgId(orgHeader);
    return this.orgUsersService.getUserDetails(orgId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('users/:userId/role')
  changeUserRole(
    @Headers('x-organization-id') orgHeader: string,
    @Param('userId') userId: string,
    @Body() dto: ChangeRoleDto,
  ) {
    const orgId = this.getOrgId(orgHeader);
    return this.orgUsersService.changeUserRole(orgId, userId, dto.roleId, dto.roleIds);
  }

  @UseGuards(JwtAuthGuard)
  @Put('users/:userId/gyms')
  assignUserGyms(
    @Headers('x-organization-id') orgHeader: string,
    @Param('userId') userId: string,
    @Body() dto: AssignGymsDto,
  ) {
    const orgId = this.getOrgId(orgHeader);
    return this.orgUsersService.assignUserGyms(orgId, userId, dto.gymIds);
  }

  @UseGuards(JwtAuthGuard)
  @Put('users/:userId/status')
  toggleUserStatus(
    @Headers('x-organization-id') orgHeader: string,
    @Param('userId') userId: string,
    @Body('isActive') isActive: boolean,
  ) {
    const orgId = this.getOrgId(orgHeader);
    return this.orgUsersService.toggleUserStatus(orgId, userId, isActive);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('users/:userId')
  removeUser(
    @Headers('x-organization-id') orgHeader: string,
    @Param('userId') userId: string,
  ) {
    const orgId = this.getOrgId(orgHeader);
    return this.orgUsersService.removeUser(orgId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('users/bulk')
  bulkUpdate(
    @Headers('x-organization-id') orgHeader: string,
    @Body() dto: BulkUpdateDto,
  ) {
    const orgId = this.getOrgId(orgHeader);
    return this.orgUsersService.bulkUpdate(orgId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('invitations')
  getInvitations(@Headers('x-organization-id') orgHeader: string) {
    const orgId = this.getOrgId(orgHeader);
    return this.orgUsersService.getInvitations(orgId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('invitations')
  createInvitation(
    @Req() req,
    @Headers('x-organization-id') orgHeader: string,
    @Body() dto: InviteUserDto,
  ) {
    const orgId = this.getOrgId(orgHeader);
    return this.orgUsersService.createInvitation(orgId, dto, req.user?.phoneNumber);
  }

  @UseGuards(JwtAuthGuard)
  @Post('invitations/:id/resend')
  resendInvitation(
    @Headers('x-organization-id') orgHeader: string,
    @Param('id') id: string,
  ) {
    const orgId = this.getOrgId(orgHeader);
    return this.orgUsersService.resendInvitation(orgId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('invitations/:id')
  deleteInvitation(
    @Headers('x-organization-id') orgHeader: string,
    @Param('id') id: string,
  ) {
    const orgId = this.getOrgId(orgHeader);
    return this.orgUsersService.deleteInvitation(orgId, id);
  }

  @Get('invitations/:id')
  getInvitationDetails(@Param('id') id: string) {
    return this.orgUsersService.getInvitationDetails(id);
  }

  @Post('invitations/:id/decline')
  declineInvitation(@Param('id') id: string) {
    return this.orgUsersService.declineInvitation(id);
  }

  @Post('invitations/:id/accept')
  acceptInvitation(
    @Param('id') id: string,
    @Body() body: { userId: string; phoneNumber: string },
  ) {
    return this.orgUsersService.acceptInvitation(id, body.userId, body.phoneNumber);
  }
}
