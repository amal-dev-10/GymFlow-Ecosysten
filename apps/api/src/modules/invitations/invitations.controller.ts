import { Controller, Post, Body, Req, UseGuards, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { TenantGuard } from '../../core/guards/tenant.guard';
import { PermissionsGuard } from '../../core/guards/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';

@Controller('v1/invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions({ resource: 'invitations', action: 'create' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createInvitation(@Req() req, @Body() dto: CreateInvitationDto) {
    return this.invitationsService.createInvitation(req.organizationId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  acceptInvitation(@Req() req, @Param('id') id: string) {
    return this.invitationsService.acceptInvitation(req.user.userId, req.user.phoneNumber, id);
  }
}
