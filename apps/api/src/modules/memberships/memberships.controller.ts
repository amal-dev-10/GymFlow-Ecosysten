import { Controller, Post, Get, Patch, Body, Req, UseGuards, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { CreateMembershipPlanDto, CreateMemberMembershipDto } from './dto/membership.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { TenantGuard } from '../../core/guards/tenant.guard';
import { PermissionsGuard } from '../../core/guards/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';

@Controller('v1/memberships')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @RequirePermissions({ resource: 'membership', action: 'view_plans' })
  @Get('subscriptions/expiring')
  @HttpCode(HttpStatus.OK)
  getExpiring(@Req() req, @Query('gymId') gymId: string, @Query('days') days: string) {
    const daysNum = parseInt(days) || 7;
    return this.membershipsService.getExpiring(req.organizationId, gymId, daysNum);
  }

  @RequirePermissions({ resource: 'membership', action: 'create_plans' })
  @Post('plans')
  @HttpCode(HttpStatus.CREATED)
  createPlan(@Req() req, @Body() dto: CreateMembershipPlanDto) {
    return this.membershipsService.createPlan(req.organizationId, dto, req.user?.userId);
  }

  @RequirePermissions({ resource: 'membership', action: 'view_plans' })
  @Get('plans')
  @HttpCode(HttpStatus.OK)
  listPlans(@Req() req) {
    return this.membershipsService.listPlans(req.organizationId);
  }

  @RequirePermissions({ resource: 'membership', action: 'view_plans' })
  @Get('plans/:id')
  @HttpCode(HttpStatus.OK)
  getPlan(@Req() req, @Param('id') id: string) {
    return this.membershipsService.getPlan(req.organizationId, id);
  }

  @RequirePermissions({ resource: 'membership', action: 'update_plans' })
  @Patch('plans/:id')
  @HttpCode(HttpStatus.OK)
  updatePlan(@Req() req, @Param('id') id: string, @Body() dto: any) {
    return this.membershipsService.updatePlan(req.organizationId, id, dto, req.user?.userId);
  }

  @RequirePermissions({ resource: 'membership', action: 'purchase' })
  @Post('purchases')
  @HttpCode(HttpStatus.CREATED)
  purchaseMembership(@Req() req, @Body() dto: CreateMemberMembershipDto) {
    return this.membershipsService.purchaseMembership(req.organizationId, dto, req.user?.userId);
  }

  @RequirePermissions({ resource: 'membership', action: 'view_plans' })
  @Get('purchases/:memberId')
  @HttpCode(HttpStatus.OK)
  listPurchased(@Req() req, @Param('memberId') memberId: string) {
    return this.membershipsService.listPurchased(req.organizationId, memberId);
  }

  @RequirePermissions({ resource: 'membership', action: 'view_plans' })
  @Get('purchases/detail/:id')
  @HttpCode(HttpStatus.OK)
  getSubscription(@Req() req, @Param('id') id: string) {
    return this.membershipsService.getSubscription(req.organizationId, id);
  }

  @RequirePermissions({ resource: 'membership', action: 'view_plans' })
  @Get('purchases/detail/:id/overview')
  @HttpCode(HttpStatus.OK)
  getSubscriptionOverview(@Req() req, @Param('id') id: string) {
    return this.membershipsService.getSubscriptionOverview(req.organizationId, id);
  }

  @RequirePermissions({ resource: 'membership', action: 'view_plans' })
  @Get('all-subscriptions')
  @HttpCode(HttpStatus.OK)
  listAllSubscriptions(@Req() req) {
    return this.membershipsService.listAllSubscriptions(req.organizationId);
  }

  @RequirePermissions({ resource: 'membership', action: 'update_plans' })
  @Patch('purchases/detail/:id')
  @HttpCode(HttpStatus.OK)
  updateSubscription(@Req() req, @Param('id') id: string, @Body() dto: any) {
    return this.membershipsService.updateSubscription(req.organizationId, id, dto, req.user?.userId);
  }

  // --- Freeze Management ---

  @RequirePermissions({ resource: 'membership', action: 'view_plans' })
  @Get('freeze')
  @HttpCode(HttpStatus.OK)
  listFreezes(@Req() req) {
    return this.membershipsService.listFreezes(req.organizationId);
  }

  @RequirePermissions({ resource: 'membership', action: 'purchase' }) // Using purchase permission as a proxy for member actions
  @Post('freeze')
  @HttpCode(HttpStatus.CREATED)
  requestFreeze(@Req() req, @Body() dto: any) {
    return this.membershipsService.requestFreeze(req.organizationId, dto, req.user?.userId);
  }

  @RequirePermissions({ resource: 'membership', action: 'update_plans' })
  @Post('freeze/:id/approve')
  @HttpCode(HttpStatus.OK)
  approveFreeze(@Req() req, @Param('id') id: string, @Body() dto: any) {
    return this.membershipsService.approveFreeze(req.organizationId, id, dto.approvedBy);
  }

  @RequirePermissions({ resource: 'membership', action: 'update_plans' })
  @Post('freeze/:id/reject')
  @HttpCode(HttpStatus.OK)
  rejectFreeze(@Req() req, @Param('id') id: string, @Body() dto: any) {
    return this.membershipsService.rejectFreeze(req.organizationId, id, dto.approvedBy, dto.rejectionReason);
  }

  @RequirePermissions({ resource: 'membership', action: 'update_plans' })
  @Post('freeze/:id/reactivate')
  @HttpCode(HttpStatus.OK)
  reactivateEarly(@Req() req, @Param('id') id: string) {
    return this.membershipsService.reactivateEarly(req.organizationId, id, req.user?.userId);
  }
}
