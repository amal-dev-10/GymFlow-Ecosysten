import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { TrackUsageDto } from './dto/track-usage.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { TenantGuard } from '../../core/guards/tenant.guard';
import { PermissionsGuard } from '../../core/guards/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';

@Controller('v1/subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  // --- PLANS (tenant-facing, read-only - admin management lives under /v1/platform/plans) ---
  @Get('plans')
  getPlans() {
    return this.subscriptionsService.getPlans();
  }

  // --- ORGANIZATION SUBSCRIPTIONS ---
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions({ resource: 'subscriptions', action: 'write' })
  @Post('subscribe')
  @HttpCode(HttpStatus.CREATED)
  subscribe(@Req() req, @Body() dto: SubscribeDto) {
    return this.subscriptionsService.subscribe(req.organizationId, dto);
  }

  // Creates a Razorpay order for a paid plan (or activates immediately if
  // the plan is free) - never charges anything itself, just prepares the
  // checkout. The subscription only activates once verify-payment confirms
  // a valid signature for a real purchase.
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions({ resource: 'subscriptions', action: 'write' })
  @Post('checkout')
  @HttpCode(HttpStatus.OK)
  checkout(@Req() req, @Body() dto: SubscribeDto) {
    return this.subscriptionsService.createCheckoutOrder(req.organizationId, dto);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions({ resource: 'subscriptions', action: 'write' })
  @Post('verify-payment')
  @HttpCode(HttpStatus.OK)
  verifyPayment(@Req() req, @Body() dto: VerifyPaymentDto) {
    return this.subscriptionsService.verifyPayment(req.organizationId, dto);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions({ resource: 'subscriptions', action: 'read' })
  @Get('active')
  getSubscription(@Req() req) {
    return this.subscriptionsService.getSubscription(req.organizationId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions({ resource: 'subscriptions', action: 'read' })
  @Get('invoices')
  getInvoices(@Req() req) {
    return this.subscriptionsService.getInvoices(req.organizationId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions({ resource: 'subscriptions', action: 'write' })
  @Post('usage')
  @HttpCode(HttpStatus.OK)
  trackUsage(@Req() req, @Body() dto: TrackUsageDto) {
    return this.subscriptionsService.trackUsage(req.organizationId, dto);
  }
}
