import { Controller, Get, Post, Put, Param, Body, Query, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { PlatformOrgDetailService } from './platform-org-detail.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../platform-plans/guards/platform-admin.guard';
import { RequirePlatformRoles } from '../platform-plans/decorators/require-platform-roles.decorator';
import { AssignPlanDto } from './dto/assign-plan.dto';
import { NotifyOrganizationDto } from './dto/notify-organization.dto';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { UpdateOrgSettingsDto } from './dto/update-org-settings.dto';
import { ExtendTrialDto } from './dto/extend-trial.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';
import { GenerateInvoiceDto } from './dto/generate-invoice.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { UpdateEnterpriseSettingsDto } from './dto/enterprise-settings.dto';
import { UpdateReminderChannelsDto } from './dto/update-reminder-channels.dto';

@Controller('v1/platform/organizations/:id')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformOrgDetailController {
  constructor(private readonly detail: PlatformOrgDetailService) {}

  // --- READ (any platform admin) ---

  @Get('overview')
  getOverview(@Param('id') id: string, @Req() req) {
    return this.detail.getOverview(id, req.user.userId);
  }

  @Get('subscription')
  getSubscription(@Param('id') id: string) {
    return this.detail.getSubscription(id);
  }

  @Get('usage-trend')
  getUsageTrend(@Param('id') id: string) {
    return this.detail.getUsageTrend(id);
  }

  @Get('branches')
  getBranches(@Param('id') id: string) {
    return this.detail.getBranches(id);
  }

  @Get('users')
  getUsers(@Param('id') id: string) {
    return this.detail.getUsers(id);
  }

  @Get('billing')
  getBilling(@Param('id') id: string) {
    return this.detail.getBilling(id);
  }

  @Get('activity')
  getActivity(@Param('id') id: string) {
    return this.detail.getActivity(id);
  }

  @Get('audit')
  getAudit(
    @Param('id') id: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.detail.getAudit(id, { search, category, page, limit });
  }

  @Get('support')
  getSupport(@Param('id') id: string) {
    return this.detail.getSupport(id);
  }

  @Get('settings')
  getSettings(@Param('id') id: string) {
    return this.detail.getSettings(id);
  }

  // --- MUTATIONS ---

  @RequirePlatformRoles('SUPER_ADMIN', 'FINANCE', 'SALES')
  @Post('assign-plan')
  @HttpCode(HttpStatus.OK)
  assignPlan(@Param('id') id: string, @Req() req, @Body() dto: AssignPlanDto) {
    return this.detail.assignPlan(id, dto, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN')
  @Post('reset-limits')
  @HttpCode(HttpStatus.OK)
  resetLimits(@Param('id') id: string, @Req() req) {
    return this.detail.resetLimits(id, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN', 'SUPPORT', 'SALES')
  @Post('notify')
  @HttpCode(HttpStatus.OK)
  notify(@Param('id') id: string, @Req() req, @Body() dto: NotifyOrganizationDto) {
    return this.detail.notify(id, dto, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN', 'SUPPORT')
  @Post('support-tickets')
  @HttpCode(HttpStatus.CREATED)
  createSupportTicket(@Param('id') id: string, @Req() req, @Body() dto: CreateSupportTicketDto) {
    return this.detail.createSupportTicket(id, dto, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN')
  @Put('settings')
  @HttpCode(HttpStatus.OK)
  updateSettings(@Param('id') id: string, @Req() req, @Body() dto: UpdateOrgSettingsDto) {
    return this.detail.updateSettings(id, dto, req.user.userId);
  }

  // --- SUBSCRIPTION LIFECYCLE (PLT-006, Finance/Sales manage commercial ops) ---

  @RequirePlatformRoles('SUPER_ADMIN', 'FINANCE', 'SALES')
  @Post('subscription/extend-trial')
  @HttpCode(HttpStatus.OK)
  extendTrial(@Param('id') id: string, @Req() req, @Body() dto: ExtendTrialDto) {
    return this.detail.extendTrial(id, dto, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN', 'FINANCE', 'SALES')
  @Post('subscription/end-trial')
  @HttpCode(HttpStatus.OK)
  endTrial(@Param('id') id: string, @Req() req) {
    return this.detail.endTrial(id, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN', 'FINANCE')
  @Post('subscription/pause')
  @HttpCode(HttpStatus.OK)
  pauseSubscription(@Param('id') id: string, @Req() req) {
    return this.detail.pauseSubscription(id, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN', 'FINANCE')
  @Post('subscription/resume')
  @HttpCode(HttpStatus.OK)
  resumeSubscription(@Param('id') id: string, @Req() req) {
    return this.detail.resumeSubscription(id, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN', 'FINANCE')
  @Post('subscription/cancel')
  @HttpCode(HttpStatus.OK)
  cancelSubscription(@Param('id') id: string, @Req() req, @Body() dto: CancelSubscriptionDto) {
    return this.detail.cancelSubscription(id, dto, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN', 'FINANCE', 'SALES')
  @Post('subscription/apply-coupon')
  @HttpCode(HttpStatus.OK)
  applyCoupon(@Param('id') id: string, @Req() req, @Body() dto: ApplyCouponDto) {
    return this.detail.applyCoupon(id, dto, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN', 'FINANCE', 'SALES')
  @Post('subscription/remove-coupon/:redemptionId')
  @HttpCode(HttpStatus.OK)
  removeCoupon(@Param('id') id: string, @Param('redemptionId') redemptionId: string, @Req() req) {
    return this.detail.removeCoupon(id, redemptionId, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN', 'FINANCE')
  @Post('subscription/generate-invoice')
  @HttpCode(HttpStatus.CREATED)
  generateInvoice(@Param('id') id: string, @Req() req, @Body() dto: GenerateInvoiceDto) {
    return this.detail.generateInvoice(id, dto, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN', 'FINANCE')
  @Post('subscription/payments/:paymentId/refund')
  @HttpCode(HttpStatus.OK)
  refundPayment(@Param('id') id: string, @Param('paymentId') paymentId: string, @Req() req, @Body() dto: RefundPaymentDto) {
    return this.detail.refundPayment(id, paymentId, dto, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN', 'FINANCE')
  @Put('subscription/enterprise-settings')
  @HttpCode(HttpStatus.OK)
  updateEnterpriseSettings(@Param('id') id: string, @Req() req, @Body() dto: UpdateEnterpriseSettingsDto) {
    return this.detail.updateEnterpriseSettings(id, dto, req.user.userId);
  }

  // --- REMINDER CHANNELS ---

  @Get('reminder-channels')
  getReminderChannels(@Param('id') id: string) {
    return this.detail.getReminderChannels(id);
  }

  @RequirePlatformRoles('SUPER_ADMIN', 'SUPPORT')
  @Put('reminder-channels')
  @HttpCode(HttpStatus.OK)
  updateReminderChannels(@Param('id') id: string, @Req() req, @Body() dto: UpdateReminderChannelsDto) {
    const actorName = req.user.fullName || req.user.email || 'Platform Admin';
    return this.detail.updateReminderChannels(id, dto, req.user.userId, actorName);
  }

  @Get('reminder-logs')
  getReminderLogs(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.detail.getReminderLogs(id, limit ? parseInt(limit) : 100);
  }

  @Get('reminder-rules')
  getReminderRules(@Param('id') id: string) {
    return this.detail.getReminderRules(id);
  }
}
