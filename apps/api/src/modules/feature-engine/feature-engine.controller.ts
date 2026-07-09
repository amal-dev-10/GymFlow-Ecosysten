import { Controller, Get, Post, Put, Delete, Param, Body, Query, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { FeatureEngineService } from './feature-engine.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../platform-plans/guards/platform-admin.guard';
import { RequirePlatformRoles } from '../platform-plans/decorators/require-platform-roles.decorator';
import { CreateFeatureDefinitionDto, UpdateFeatureDefinitionDto } from './dto/feature-definition.dto';
import { CreateResourceDefinitionDto, UpdateResourceDefinitionDto } from './dto/resource-definition.dto';
import { CreateFeatureDependencyDto } from './dto/feature-dependency.dto';
import { UpdateValidationRuleDto } from './dto/validation-rule.dto';
import { CreateOverrideDto } from './dto/create-override.dto';
import { SetWorkspaceExperienceOverrideDto } from './dto/workspace-experience-override.dto';
import { EvaluateFeatureDto, EvaluateResourceDto } from './dto/evaluate.dto';

@Controller('v1/platform/feature-engine')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class FeatureEngineController {
  constructor(private readonly engine: FeatureEngineService) {}

  // --- DASHBOARD ---

  @Get('dashboard')
  getDashboard() {
    return this.engine.getDashboard();
  }

  // --- FEATURES ---

  @Get('features')
  listFeatures() {
    return this.engine.listFeatures();
  }

  @RequirePlatformRoles('SUPER_ADMIN', 'FINANCE')
  @Post('features')
  @HttpCode(HttpStatus.CREATED)
  createFeature(@Req() req, @Body() dto: CreateFeatureDefinitionDto) {
    return this.engine.createFeature(dto, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN', 'FINANCE')
  @Put('features/:key')
  updateFeature(@Param('key') key: string, @Req() req, @Body() dto: UpdateFeatureDefinitionDto) {
    return this.engine.updateFeature(key, dto, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN')
  @Delete('features/:key')
  deleteFeature(@Param('key') key: string, @Req() req) {
    return this.engine.deleteFeature(key, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN', 'FINANCE')
  @Post('features/dependencies')
  @HttpCode(HttpStatus.CREATED)
  addFeatureDependency(@Req() req, @Body() dto: CreateFeatureDependencyDto) {
    return this.engine.addFeatureDependency(dto, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN', 'FINANCE')
  @Delete('features/dependencies/:id')
  removeFeatureDependency(@Param('id') id: string, @Req() req) {
    return this.engine.removeFeatureDependency(id, req.user.userId);
  }

  // --- LIMITS / RESOURCES ---

  @Get('limits')
  listResources() {
    return this.engine.listResources();
  }

  @RequirePlatformRoles('SUPER_ADMIN', 'FINANCE')
  @Post('limits')
  @HttpCode(HttpStatus.CREATED)
  createResource(@Req() req, @Body() dto: CreateResourceDefinitionDto) {
    return this.engine.createResource(dto, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN', 'FINANCE')
  @Put('limits/:key')
  updateResource(@Param('key') key: string, @Req() req, @Body() dto: UpdateResourceDefinitionDto) {
    return this.engine.updateResource(key, dto, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN')
  @Delete('limits/:key')
  deleteResource(@Param('key') key: string, @Req() req) {
    return this.engine.deleteResource(key, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN', 'FINANCE')
  @Put('limits/:key/validation-rules/:planId')
  updateValidationRule(@Param('key') key: string, @Param('planId') planId: string, @Req() req, @Body() dto: UpdateValidationRuleDto) {
    return this.engine.updateValidationRule(planId, key, dto, req.user.userId);
  }

  // --- MATRICES ---

  @Get('matrix/features')
  getFeatureMatrix() {
    return this.engine.getFeatureMatrix();
  }

  @Get('matrix/limits')
  getResourceMatrix() {
    return this.engine.getResourceMatrix();
  }

  // --- WORKSPACE EXPERIENCE ---

  @Get('workspace-experience')
  listWorkspaceExperience() {
    return this.engine.listWorkspaceExperience();
  }

  @RequirePlatformRoles('SUPER_ADMIN', 'FINANCE', 'SUPPORT')
  @Put('organizations/:id/workspace-experience')
  setOrganizationWorkspaceExperience(@Param('id') id: string, @Req() req, @Body() dto: SetWorkspaceExperienceOverrideDto) {
    return this.engine.setOrganizationWorkspaceExperience(id, dto, req.user.userId);
  }

  // --- ORGANIZATIONS ---

  @Get('organizations')
  listOrganizationsUsage(@Query('search') search?: string, @Query('planId') planId?: string) {
    return this.engine.listOrganizationsUsage({ search, planId });
  }

  @Get('organizations/:id')
  getOrganizationDetail(@Param('id') id: string) {
    return this.engine.getOrganizationDetail(id);
  }

  @Get('organizations/:id/upgrade-recommendation')
  getUpgradeRecommendation(@Param('id') id: string) {
    return this.engine.getUpgradeRecommendation(id);
  }

  // --- VIOLATIONS ---

  @Get('violations')
  computeViolations(@Query('organizationId') organizationId?: string, @Query('severity') severity?: 'warning' | 'exceeded') {
    return this.engine.computeViolations({ organizationId, severity });
  }

  // --- OVERRIDES ---

  @Get('overrides')
  listOverrides(@Query('organizationId') organizationId?: string, @Query('status') status?: string, @Query('scope') scope?: string) {
    return this.engine.listOverrides({ organizationId, status, scope });
  }

  @RequirePlatformRoles('SUPER_ADMIN', 'FINANCE', 'SUPPORT')
  @Post('overrides')
  @HttpCode(HttpStatus.CREATED)
  createOverride(@Req() req, @Body() dto: CreateOverrideDto) {
    return this.engine.createOverride(dto, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN', 'FINANCE', 'SUPPORT')
  @Post('overrides/:id/revoke')
  @HttpCode(HttpStatus.OK)
  revokeOverride(@Param('id') id: string, @Req() req) {
    return this.engine.revokeOverride(id, req.user.userId);
  }

  // --- EVALUATION (the single source of truth for other services) ---

  @Post('evaluate/feature')
  @HttpCode(HttpStatus.OK)
  evaluateFeature(@Body() dto: EvaluateFeatureDto) {
    return this.engine.evaluateFeature(dto);
  }

  @Post('evaluate/resource')
  @HttpCode(HttpStatus.OK)
  evaluateResource(@Body() dto: EvaluateResourceDto) {
    return this.engine.evaluateResource(dto);
  }

  // --- AUDIT ---

  @Get('audit')
  getAuditLog(
    @Query('entityType') entityType?: string,
    @Query('organizationId') organizationId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.engine.getAuditLog({ entityType, organizationId, page, limit });
  }

  // --- DEVELOPER PREVIEW ---

  @Get('developer-preview')
  getDeveloperPreview(
    @Query('organizationId') organizationId: string,
    @Query('featureKey') featureKey?: string,
    @Query('resourceKey') resourceKey?: string,
  ) {
    return this.engine.getDeveloperPreview(organizationId, featureKey, resourceKey);
  }
}
