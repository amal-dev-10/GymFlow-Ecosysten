import { Controller, Get, Post, Put, Param, Body, Query, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { PlatformPlansService } from './platform-plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { DuplicatePlanDto } from './dto/duplicate-plan.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { PlatformAdminGuard } from './guards/platform-admin.guard';
import { RequirePlatformRoles } from './decorators/require-platform-roles.decorator';

@Controller('v1/platform/plans')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformPlansController {
  constructor(private readonly platformPlansService: PlatformPlansService) {}

  // --- STATS & CATALOGS (must be declared before the :id routes) ---

  @Get('stats')
  getStats() {
    return this.platformPlansService.getStats();
  }

  @Get('catalogs/resources')
  listResourceCatalog() {
    return this.platformPlansService.listResourceCatalog();
  }

  @Get('catalogs/features')
  listFeatureCatalog() {
    return this.platformPlansService.listFeatureCatalog();
  }

  // --- LIST / DETAIL ---

  @Get()
  listPlans(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('visibility') visibility?: string,
    @Query('billingCycle') billingCycle?: string,
  ) {
    return this.platformPlansService.listPlans({ search, status, visibility, billingCycle });
  }

  @Get(':id')
  getPlan(@Param('id') id: string) {
    return this.platformPlansService.getPlan(id);
  }

  @Get(':id/version-history')
  getVersionHistory(@Param('id') id: string) {
    return this.platformPlansService.getVersionHistory(id);
  }

  @Get(':id/audit-log')
  getAuditLog(@Param('id') id: string) {
    return this.platformPlansService.getAuditLog(id);
  }

  // --- MUTATIONS (Super Admin / Finance only) ---

  @RequirePlatformRoles('SUPER_ADMIN', 'FINANCE')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createPlan(@Req() req, @Body() dto: CreatePlanDto) {
    return this.platformPlansService.createPlan(dto, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN', 'FINANCE')
  @Put(':id')
  updatePlan(@Param('id') id: string, @Req() req, @Body() dto: UpdatePlanDto) {
    return this.platformPlansService.updatePlan(id, dto, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN', 'FINANCE')
  @Post(':id/duplicate')
  duplicatePlan(@Param('id') id: string, @Req() req, @Body() dto: DuplicatePlanDto) {
    return this.platformPlansService.duplicatePlan(id, dto, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN', 'FINANCE')
  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  archivePlan(@Param('id') id: string, @Req() req) {
    return this.platformPlansService.archivePlan(id, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN', 'FINANCE')
  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  activatePlan(@Param('id') id: string, @Req() req) {
    return this.platformPlansService.activatePlan(id, req.user.userId);
  }
}

@Controller('v1/public/plans')
export class PublicPlansController {
  constructor(private readonly platformPlansService: PlatformPlansService) {}

  @Get()
  listPublicPlans() {
    return this.platformPlansService.listPublicPlans();
  }
}
