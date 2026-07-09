import { Controller, Get, Post, Put, Delete, Param, Body, Query, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { PlatformAuditService } from './platform-audit.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../platform-plans/guards/platform-admin.guard';
import { PlatformPermissionGuard } from '../platform-roles/guards/platform-permission.guard';
import { RequirePlatformPermission } from '../platform-roles/decorators/require-platform-permission.decorator';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';
import { CreateSavedSearchDto, UpdateSavedSearchDto } from './dto/saved-search.dto';
import { UpdateRetentionSettingDto } from './dto/retention-setting.dto';
import { CreateAlertRuleDto, UpdateAlertRuleDto } from './dto/alert-rule.dto';
import { RecordExportDto } from './dto/record-export.dto';

// Every mutation here goes through the new PLT-008 permission framework
// rather than the legacy @RequirePlatformRoles('SUPER_ADMIN') fallback -
// unlike platform-roles' own bootstrap case, audit mutations don't gate
// access to the framework itself, so there's no paradox to avoid. This is
// the "future modules call the authorization framework" case in practice.
@Controller('v1/platform/audit')
@UseGuards(JwtAuthGuard, PlatformAdminGuard, PlatformPermissionGuard)
export class PlatformAuditController {
  constructor(private readonly service: PlatformAuditService) {}

  // --- DASHBOARD / CATEGORIES ---

  @RequirePlatformPermission('audit_logs.view')
  @Get('dashboard')
  getDashboard() {
    return this.service.getDashboard();
  }

  @RequirePlatformPermission('audit_logs.view')
  @Get('categories')
  listCategories() {
    return this.service.listCategories();
  }

  @RequirePlatformPermission('audit_logs.manage_settings')
  @Put('categories/:key')
  setCategoryEnabled(@Param('key') key: string, @Body('isEnabled') isEnabled: boolean) {
    return this.service.setCategoryEnabled(key, isEnabled);
  }

  // --- SECURITY EVENTS / API ACTIVITY ---

  @RequirePlatformPermission('audit_logs.view_security')
  @Get('security-events')
  getSecurityEvents(@Query() query: ListAuditLogsDto) {
    return this.service.getSecurityEvents(query);
  }

  @RequirePlatformPermission('audit_logs.view_api')
  @Get('api-activity')
  getApiActivity(@Query() query: { page?: number; limit?: number; path?: string; statusCode?: number }) {
    return this.service.getApiActivity(query);
  }

  // --- SAVED SEARCHES ---

  @RequirePlatformPermission('audit_logs.view')
  @Get('saved-searches')
  listSavedSearches() {
    return this.service.listSavedSearches();
  }

  @RequirePlatformPermission('audit_logs.view')
  @Post('saved-searches')
  @HttpCode(HttpStatus.CREATED)
  createSavedSearch(@Req() req, @Body() dto: CreateSavedSearchDto) {
    return this.service.createSavedSearch(dto, req.user.userId);
  }

  @RequirePlatformPermission('audit_logs.view')
  @Put('saved-searches/:id')
  updateSavedSearch(@Param('id') id: string, @Body() dto: UpdateSavedSearchDto) {
    return this.service.updateSavedSearch(id, dto);
  }

  @RequirePlatformPermission('audit_logs.view')
  @Delete('saved-searches/:id')
  removeSavedSearch(@Param('id') id: string) {
    return this.service.removeSavedSearch(id);
  }

  // --- RETENTION ---

  @RequirePlatformPermission('audit_logs.manage_retention')
  @Get('retention')
  getRetentionSetting() {
    return this.service.getRetentionSetting();
  }

  @RequirePlatformPermission('audit_logs.manage_retention')
  @Put('retention')
  updateRetentionSetting(@Req() req, @Body() dto: UpdateRetentionSettingDto) {
    return this.service.updateRetentionSetting(dto, req.user.userId);
  }

  @RequirePlatformPermission('audit_logs.manage_retention')
  @Get('retention/preview')
  previewRetention(@Query('days') days?: string) {
    return this.service.previewRetention(days ? Number(days) : null);
  }

  // --- ALERTS ---

  @RequirePlatformPermission('audit_logs.manage_alerts')
  @Get('alerts')
  listAlertRules() {
    return this.service.listAlertRules();
  }

  @RequirePlatformPermission('audit_logs.manage_alerts')
  @Post('alerts')
  @HttpCode(HttpStatus.CREATED)
  createAlertRule(@Req() req, @Body() dto: CreateAlertRuleDto) {
    return this.service.createAlertRule(dto, req.user.userId);
  }

  @RequirePlatformPermission('audit_logs.manage_alerts')
  @Put('alerts/:id')
  updateAlertRule(@Param('id') id: string, @Body() dto: UpdateAlertRuleDto) {
    return this.service.updateAlertRule(id, dto);
  }

  @RequirePlatformPermission('audit_logs.manage_alerts')
  @Delete('alerts/:id')
  removeAlertRule(@Param('id') id: string) {
    return this.service.removeAlertRule(id);
  }

  @RequirePlatformPermission('audit_logs.manage_alerts')
  @Get('alerts/:id/preview')
  previewAlertRule(@Param('id') id: string) {
    return this.service.previewAlertRule(id);
  }

  // --- EXPORT ---

  @RequirePlatformPermission('audit_logs.export')
  @Get('export-jobs')
  listExportJobs() {
    return this.service.listExportJobs();
  }

  @RequirePlatformPermission('audit_logs.export')
  @Post('export')
  @HttpCode(HttpStatus.CREATED)
  recordExport(@Req() req, @Body() dto: RecordExportDto) {
    return this.service.recordExport(dto, req.user.userId);
  }

  // --- RELATED EVENTS ---

  @RequirePlatformPermission('audit_logs.view')
  @Get('related/:correlationId')
  getRelatedEvents(@Param('correlationId') correlationId: string) {
    return this.service.getRelatedEvents(correlationId);
  }

  // --- EXPLORER (root + :id last, since these are the least specific routes) ---

  @RequirePlatformPermission('audit_logs.view')
  @Get()
  list(@Query() query: ListAuditLogsDto) {
    return this.service.list(query);
  }

  @RequirePlatformPermission('audit_logs.view')
  @Get(':id')
  getDetails(@Param('id') id: string) {
    return this.service.getDetails(id);
  }
}
