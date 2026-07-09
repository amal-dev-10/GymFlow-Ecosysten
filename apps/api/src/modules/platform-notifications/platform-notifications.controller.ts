import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { PlatformNotificationsService } from './platform-notifications.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../platform-plans/guards/platform-admin.guard';
import { PlatformPermissionGuard } from '../platform-roles/guards/platform-permission.guard';
import { RequirePlatformPermission } from '../platform-roles/decorators/require-platform-permission.decorator';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { QuickSendDto } from './dto/quick-send.dto';
import { CreateTemplateDto, UpdateTemplateDto, PreviewTemplateDto } from './dto/template.dto';
import { CreateCampaignDto, UpdateCampaignDto, ResolveAudienceDto } from './dto/campaign.dto';

const actorName = (req: any) => req.user.fullName || req.user.email || 'Platform Admin';

@Controller('v1/platform/notifications')
@UseGuards(JwtAuthGuard, PlatformAdminGuard, PlatformPermissionGuard)
export class PlatformNotificationsController {
  constructor(private readonly service: PlatformNotificationsService) {}

  // --- DASHBOARD ---
  @RequirePlatformPermission('notifications.view')
  @Get('dashboard')
  getDashboard(@Req() req) {
    return this.service.getDashboard(req.user.userId);
  }

  // --- VARIABLES / AUDIENCE ---
  @RequirePlatformPermission('notifications.view')
  @Get('variables')
  getVariableCatalog() {
    return this.service.getVariableCatalog();
  }

  @RequirePlatformPermission('notifications.view')
  @Post('resolve-audience')
  resolveAudience(@Body() dto: ResolveAudienceDto) {
    return this.service.resolveAudienceCount(dto.audienceType, dto.audienceFilter);
  }

  // --- CHANNELS ---
  @RequirePlatformPermission('notifications.view')
  @Get('channels')
  listChannels() {
    return this.service.listChannels();
  }

  @RequirePlatformPermission('notifications.manage_campaigns')
  @Put('channels/:key')
  updateChannel(@Param('key') key: string, @Req() req, @Body('isActive') isActive: boolean) {
    return this.service.updateChannel(key, isActive, req.user.userId, actorName(req));
  }

  // --- TEMPLATES ---
  @RequirePlatformPermission('notifications.view')
  @Get('templates')
  listTemplates(@Query() query: { category?: string; channel?: string; status?: string; search?: string }) {
    return this.service.listTemplates(query);
  }

  @RequirePlatformPermission('notifications.view')
  @Get('templates/:id')
  getTemplate(@Param('id') id: string) {
    return this.service.getTemplate(id);
  }

  @RequirePlatformPermission('notifications.manage_templates')
  @Post('templates')
  createTemplate(@Req() req, @Body() dto: CreateTemplateDto) {
    return this.service.createTemplate(dto, req.user.userId, actorName(req));
  }

  @RequirePlatformPermission('notifications.manage_templates')
  @Put('templates/:id')
  updateTemplate(@Param('id') id: string, @Req() req, @Body() dto: UpdateTemplateDto) {
    return this.service.updateTemplate(id, dto, req.user.userId, actorName(req));
  }

  @RequirePlatformPermission('notifications.manage_templates')
  @Post('templates/:id/archive')
  archiveTemplate(@Param('id') id: string, @Req() req) {
    return this.service.archiveTemplate(id, req.user.userId, actorName(req));
  }

  @RequirePlatformPermission('notifications.view')
  @Post('templates/:id/preview')
  previewTemplate(@Param('id') id: string, @Body() dto: PreviewTemplateDto) {
    return this.service.previewTemplate(id, dto.sampleValues);
  }

  // --- CAMPAIGNS ---
  @RequirePlatformPermission('notifications.view')
  @Get('campaigns')
  listCampaigns(@Query() query: { status?: string; channel?: string; search?: string }) {
    return this.service.listCampaigns(query);
  }

  @RequirePlatformPermission('notifications.view')
  @Get('campaigns/:id')
  getCampaign(@Param('id') id: string) {
    return this.service.getCampaign(id);
  }

  @RequirePlatformPermission('notifications.manage_campaigns')
  @Post('campaigns')
  createCampaign(@Req() req, @Body() dto: CreateCampaignDto) {
    return this.service.createCampaign(dto, req.user.userId, actorName(req));
  }

  @RequirePlatformPermission('notifications.manage_campaigns')
  @Put('campaigns/:id')
  updateCampaign(@Param('id') id: string, @Req() req, @Body() dto: UpdateCampaignDto) {
    return this.service.updateCampaign(id, dto, req.user.userId, actorName(req));
  }

  @RequirePlatformPermission('notifications.manage_campaigns')
  @Post('campaigns/:id/cancel')
  cancelCampaign(@Param('id') id: string, @Req() req) {
    return this.service.cancelCampaign(id, req.user.userId, actorName(req));
  }

  @RequirePlatformPermission('notifications.send')
  @Post('campaigns/:id/send-now')
  sendCampaignNow(@Param('id') id: string, @Req() req) {
    return this.service.sendCampaignNow(id, req.user.userId, actorName(req));
  }

  // --- SCHEDULES ---
  @RequirePlatformPermission('notifications.view')
  @Get('schedules')
  listSchedules() {
    return this.service.listSchedules();
  }

  // --- NOTIFICATIONS (list/quick-send/cancel) ---
  @RequirePlatformPermission('notifications.send')
  @Post('quick-send')
  quickSend(@Req() req, @Body() dto: QuickSendDto) {
    return this.service.quickSend(dto, req.user.userId, actorName(req));
  }

  @RequirePlatformPermission('notifications.view')
  @Get()
  listNotifications(@Query() query: ListNotificationsDto) {
    return this.service.listNotifications(query);
  }

  @RequirePlatformPermission('notifications.view')
  @Get(':id')
  getNotification(@Param('id') id: string) {
    return this.service.getNotification(id);
  }

  @RequirePlatformPermission('notifications.manage_campaigns')
  @Post(':id/cancel')
  cancelNotification(@Param('id') id: string, @Req() req) {
    return this.service.cancelNotification(id, req.user.userId, actorName(req));
  }
}
