import { Controller, Get, Post, Param, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { TenantGuard } from '../../core/guards/tenant.guard';

// Tenant-facing read side of platform announcements. Scoped to the org named in
// the x-organization-id header (TenantGuard); any org member may read/ack.
@Controller('v1/announcements')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AnnouncementsController {
  constructor(private readonly service: AnnouncementsService) {}

  @Get()
  list(@Req() req) {
    return this.service.list(req.organizationId);
  }

  @Get('unread-count')
  unreadCount(@Req() req) {
    return this.service.unreadCount(req.organizationId);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  markRead(@Req() req, @Param('id') id: string) {
    return this.service.markRead(req.organizationId, id);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  markAllRead(@Req() req) {
    return this.service.markAllRead(req.organizationId);
  }
}
