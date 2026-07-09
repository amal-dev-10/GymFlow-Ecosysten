import { Controller, Get, Post, Put, Param, Body, Query, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { PlatformRevenueService } from './platform-revenue.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../platform-plans/guards/platform-admin.guard';
import { PlatformPermissionGuard } from '../platform-roles/guards/platform-permission.guard';
import { RequirePlatformPermission } from '../platform-roles/decorators/require-platform-permission.decorator';
import { ListInvoicesDto } from './dto/list-invoices.dto';
import { ListPaymentsDto } from './dto/list-payments.dto';
import { PlatformGenerateInvoiceDto } from './dto/generate-invoice.dto';
import { PlatformRefundPaymentDto } from './dto/refund-payment.dto';
import { PlatformApplyCouponDto } from './dto/apply-coupon.dto';
import { PlatformExtendTrialDto } from './dto/extend-trial.dto';
import { RetryPaymentDto } from './dto/retry-payment.dto';
import { RecordRevenueExportDto } from './dto/record-export.dto';

// This is GymFlow's own revenue (organizations paying GymFlow for plans) -
// never member-level/tenant-internal billing. Reads gated by PLT-008's
// existing revenue.view/billing.view; mutations reuse PlatformOrgDetailService
// under the hood rather than reimplementing the billing lifecycle.
@Controller('v1/platform/revenue')
@UseGuards(JwtAuthGuard, PlatformAdminGuard, PlatformPermissionGuard)
export class PlatformRevenueController {
  constructor(private readonly service: PlatformRevenueService) {}

  // --- DASHBOARD / CHARTS / ANALYTICS ---

  @RequirePlatformPermission('revenue.view')
  @Get('dashboard')
  getDashboard() {
    return this.service.getDashboard();
  }

  @RequirePlatformPermission('revenue.view')
  @Get('widget-summary')
  getWidgetSummary() {
    return this.service.getWidgetSummary();
  }

  @RequirePlatformPermission('revenue.view')
  @Get('charts')
  getRevenueCharts() {
    return this.service.getRevenueCharts();
  }

  @RequirePlatformPermission('revenue.view')
  @Get('subscription-analytics')
  getSubscriptionAnalytics() {
    return this.service.getSubscriptionAnalytics();
  }

  // --- INVOICES ---

  @RequirePlatformPermission('billing.view')
  @Get('invoices')
  listInvoices(@Query() query: ListInvoicesDto) {
    return this.service.listInvoices(query);
  }

  @RequirePlatformPermission('billing.generate_invoice')
  @Post('invoices/generate')
  @HttpCode(HttpStatus.CREATED)
  generateInvoice(@Req() req, @Body() dto: PlatformGenerateInvoiceDto) {
    return this.service.generateInvoice(dto, req.user.userId);
  }

  // --- PAYMENTS ---

  @RequirePlatformPermission('billing.view')
  @Get('payments')
  listPayments(@Query() query: ListPaymentsDto) {
    return this.service.listPayments(query);
  }

  @RequirePlatformPermission('billing.issue_refund')
  @Post('payments/:paymentId/refund')
  refundPayment(@Param('paymentId') paymentId: string, @Req() req, @Body() dto: PlatformRefundPaymentDto) {
    return this.service.refundPayment(paymentId, dto, req.user.userId);
  }

  @RequirePlatformPermission('billing.view')
  @Post('payments/:paymentId/retry')
  retryPayment(@Param('paymentId') paymentId: string, @Req() req, @Body() dto: RetryPaymentDto) {
    return this.service.retryPayment(paymentId, dto.organizationId, req.user.userId);
  }

  // --- REFUNDS ---

  @RequirePlatformPermission('billing.view')
  @Get('refunds')
  listRefunds(@Query() query: { page?: number; limit?: number; organizationId?: string; startDate?: string; endDate?: string }) {
    return this.service.listRefunds(query);
  }

  // --- COUPONS (analytics only - management stays on /v1/platform/coupons) ---

  @RequirePlatformPermission('revenue.view')
  @Get('coupons/analytics')
  getCouponAnalytics() {
    return this.service.getCouponAnalytics();
  }

  // --- ORGANIZATION BILLING LOOKUP ---

  @RequirePlatformPermission('billing.view')
  @Get('organizations/search')
  searchOrganizations(@Query('q') q: string) {
    return this.service.searchOrganizations(q || '');
  }

  @RequirePlatformPermission('billing.view')
  @Get('organizations/:organizationId/billing-snapshot')
  getOrgBillingSnapshot(@Param('organizationId') organizationId: string) {
    return this.service.getOrgBillingSnapshot(organizationId);
  }

  // --- SUBSCRIPTION QUICK ACTIONS ---

  @RequirePlatformPermission('billing.view')
  @Post('subscriptions/apply-coupon')
  applyCoupon(@Req() req, @Body() dto: PlatformApplyCouponDto) {
    return this.service.applyCoupon(dto, req.user.userId);
  }

  @RequirePlatformPermission('billing.view')
  @Post('subscriptions/extend-trial')
  extendTrial(@Req() req, @Body() dto: PlatformExtendTrialDto) {
    return this.service.extendTrial(dto, req.user.userId);
  }

  // --- FORECASTING / REPORTS / TAX ---

  @RequirePlatformPermission('revenue.view')
  @Get('forecast')
  getForecast() {
    return this.service.getForecast();
  }

  @RequirePlatformPermission('revenue.view')
  @Get('reports/:type')
  getReports(@Param('type') type: string) {
    return this.service.getReports(type);
  }

  @RequirePlatformPermission('billing.manage_taxes')
  @Get('tax-summary')
  getTaxSummary() {
    return this.service.getTaxSummary();
  }

  // --- GATEWAYS ---

  @RequirePlatformPermission('billing.view')
  @Get('gateways')
  listGateways() {
    return this.service.listGateways();
  }

  @RequirePlatformPermission('billing.manage_gateways')
  @Put('gateways/:key')
  updateGateway(@Param('key') key: string, @Req() req, @Body('isActive') isActive: boolean) {
    return this.service.updateGateway(key, isActive, req.user.userId);
  }

  // --- NOTIFICATIONS / EXPORT ---

  @RequirePlatformPermission('revenue.view')
  @Get('notifications')
  getNotifications() {
    return this.service.getNotifications();
  }

  @RequirePlatformPermission('billing.export')
  @Post('export')
  @HttpCode(HttpStatus.CREATED)
  recordExport(@Req() req, @Body() dto: RecordRevenueExportDto) {
    return this.service.recordExport(dto, req.user.userId);
  }
}
