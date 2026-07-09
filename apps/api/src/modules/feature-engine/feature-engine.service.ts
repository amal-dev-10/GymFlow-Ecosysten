import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateFeatureDefinitionDto, UpdateFeatureDefinitionDto } from './dto/feature-definition.dto';
import { CreateResourceDefinitionDto, UpdateResourceDefinitionDto } from './dto/resource-definition.dto';
import { CreateFeatureDependencyDto } from './dto/feature-dependency.dto';
import { UpdateValidationRuleDto } from './dto/validation-rule.dto';
import { CreateOverrideDto } from './dto/create-override.dto';
import { SetWorkspaceExperienceOverrideDto } from './dto/workspace-experience-override.dto';
import { EvaluateFeatureDto, EvaluateResourceDto } from './dto/evaluate.dto';

const AUDIT_CATEGORY = 'Feature Engine';
const ACTIVE_SUBSCRIPTION_STATUSES = ['Active', 'Trialing', 'Past_Due', 'Grace_Period', 'Paused', 'Pending_Payment'];

// Resources that can be measured directly against real operational tables
// instead of the (currently unpopulated) SubscriptionUsage ledger. Anything
// not listed here falls back to SubscriptionUsage.currentValue - honest
// zero-usage rather than a fabricated number.
const RESOURCE_COUNTERS: Record<string, (prisma: DatabaseService, organizationId: string) => Promise<number>> = {
  organizations: async () => 1,
  branches: (prisma, organizationId) => prisma.gym.count({ where: { organizationId, deletedAt: null } }),
  members: (prisma, organizationId) => prisma.member.count({ where: { organizationId, deletedAt: null } }),
  organization_users: (prisma, organizationId) => prisma.organizationUser.count({ where: { organizationId, isActive: true } }),
  membership_plans: (prisma, organizationId) => prisma.membershipPlan.count({ where: { organizationId } }),
  workout_programs: (prisma, organizationId) => prisma.workout.count({ where: { organizationId, deletedAt: null } }),
  exercises: (prisma, organizationId) => prisma.exercise.count({ where: { organizationId } }),
  attendance_records: (prisma, organizationId) => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    return prisma.attendance.count({ where: { organizationId, checkInTime: { gte: startOfMonth } } });
  },
  invoices: async (prisma, organizationId) => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    return prisma.subscriptionInvoice.count({
      where: { subscription: { organizationId }, createdAt: { gte: startOfMonth } },
    });
  },
};

@Injectable()
export class FeatureEngineService {
  constructor(
    private prisma: DatabaseService,
    private auditLogsService: AuditLogsService,
  ) {}

  // ---------------------------------------------------------------------------
  // DASHBOARD
  // ---------------------------------------------------------------------------

  async getDashboard() {
    const [
      organizationsUsingEngine,
      activeLimitRules,
      activeFeatureRules,
      features,
      resources,
      overridesActive,
      usageTouchedToday,
    ] = await Promise.all([
      this.prisma.organizationSubscription.count({ where: { status: { in: ACTIVE_SUBSCRIPTION_STATUSES } } }),
      this.prisma.planResourceLimit.count(),
      this.prisma.planFeatureAccess.count({ where: { state: { not: 'DISABLED' } } }),
      this.prisma.featureDefinition.findMany({ include: { planAccess: true } }),
      this.prisma.resourceDefinition.findMany({ include: { planLimits: true } }),
      this.prisma.engineOverride.count({ where: { status: 'ACTIVE' } }),
      this.prisma.subscriptionUsage.count({ where: { updatedAt: { gte: this.startOfToday() } } }),
    ]);

    const enabledFeatures = features.filter((f) => f.planAccess.some((a) => ['ENABLED', 'BETA', 'ENTERPRISE_ONLY'].includes(a.state))).length;
    const disabledFeatures = features.length - enabledFeatures;
    const unlimitedResources = resources.filter((r) => r.planLimits.some((l) => l.limitType === 'UNLIMITED')).length;

    const violations = await this.computeViolations({});
    const violationsToday = violations.filter((v) => v.severity === 'exceeded').length;
    const limitWarnings = violations.filter((v) => v.severity === 'warning').length;

    return {
      organizationsUsingEngine,
      activeRules: activeLimitRules + activeFeatureRules,
      enabledFeatures,
      disabledFeatures,
      unlimitedResources,
      ruleViolationsToday: violationsToday,
      featureUsageToday: usageTouchedToday,
      limitWarnings,
      overridesActive,
    };
  }

  // ---------------------------------------------------------------------------
  // FEATURES
  // ---------------------------------------------------------------------------

  async listFeatures() {
    const features = await this.prisma.featureDefinition.findMany({
      orderBy: [{ category: 'asc' }, { label: 'asc' }],
      include: {
        planAccess: { include: { plan: { select: { id: true, name: true, status: true } } } },
        dependsOn: { include: { requiresFeature: { select: { key: true, label: true } } } },
        requiredFor: { include: { feature: { select: { key: true, label: true } } } },
      },
    });
    return features.map((f) => ({
      ...f,
      stateSummary: this.summarizeFeatureStates(f.planAccess),
    }));
  }

  async createFeature(dto: CreateFeatureDefinitionDto, actorUserId: string) {
    const existing = await this.prisma.featureDefinition.findUnique({ where: { key: dto.key } });
    if (existing) throw new BadRequestException(`Feature key "${dto.key}" already exists.`);

    const feature = await this.prisma.featureDefinition.create({
      data: { key: dto.key, label: dto.label, category: dto.category || 'General', description: dto.description },
    });

    await this.logEngineEvent(actorUserId, 'Feature Created', `Added "${feature.label}" to the feature catalog.`, 'FeatureDefinition', feature.key);
    return feature;
  }

  async updateFeature(key: string, dto: UpdateFeatureDefinitionDto, actorUserId: string) {
    await this.assertFeatureExists(key);
    const feature = await this.prisma.featureDefinition.update({ where: { key }, data: dto });
    await this.logEngineEvent(actorUserId, 'Feature Updated', `Updated feature "${feature.label}".`, 'FeatureDefinition', key);
    return feature;
  }

  async deleteFeature(key: string, actorUserId: string) {
    const feature = await this.assertFeatureExists(key);
    const usageCount = await this.prisma.planFeatureAccess.count({ where: { featureKey: key, state: { not: 'DISABLED' } } });
    if (usageCount > 0) {
      throw new BadRequestException(`"${feature.label}" is still granted by ${usageCount} plan(s). Disable it on those plans first.`);
    }
    await this.prisma.featureDefinition.delete({ where: { key } });
    await this.logEngineEvent(actorUserId, 'Feature Removed', `Removed "${feature.label}" from the feature catalog.`, 'FeatureDefinition', key);
    return { success: true };
  }

  async addFeatureDependency(dto: CreateFeatureDependencyDto, actorUserId: string) {
    if (dto.featureKey === dto.requiresFeatureKey) {
      throw new BadRequestException('A feature cannot depend on itself.');
    }
    await this.assertFeatureExists(dto.featureKey);
    await this.assertFeatureExists(dto.requiresFeatureKey);

    const dependency = await this.prisma.featureDependency.upsert({
      where: { featureKey_requiresFeatureKey: dto },
      update: {},
      create: dto,
      include: { feature: true, requiresFeature: true },
    });

    await this.logEngineEvent(
      actorUserId,
      'Feature Dependency Added',
      `"${dependency.feature.label}" now requires "${dependency.requiresFeature.label}".`,
      'FeatureDependency',
      dependency.id,
    );
    return dependency;
  }

  async removeFeatureDependency(id: string, actorUserId: string) {
    const dependency = await this.prisma.featureDependency.findUnique({
      where: { id },
      include: { feature: true, requiresFeature: true },
    });
    if (!dependency) throw new NotFoundException('Feature dependency not found');

    await this.prisma.featureDependency.delete({ where: { id } });
    await this.logEngineEvent(
      actorUserId,
      'Feature Dependency Removed',
      `"${dependency.feature.label}" no longer requires "${dependency.requiresFeature.label}".`,
      'FeatureDependency',
      id,
    );
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // RESOURCE LIMITS
  // ---------------------------------------------------------------------------

  async listResources() {
    const resources = await this.prisma.resourceDefinition.findMany({
      orderBy: [{ category: 'asc' }, { label: 'asc' }],
      include: { planLimits: { include: { plan: { select: { id: true, name: true, status: true } } } } },
    });
    return resources.map((r) => ({ ...r, limitSummary: this.summarizeLimits(r.planLimits) }));
  }

  async createResource(dto: CreateResourceDefinitionDto, actorUserId: string) {
    const existing = await this.prisma.resourceDefinition.findUnique({ where: { key: dto.key } });
    if (existing) throw new BadRequestException(`Resource key "${dto.key}" already exists.`);

    const resource = await this.prisma.resourceDefinition.create({
      data: { key: dto.key, label: dto.label, unit: dto.unit, category: dto.category || 'General', description: dto.description },
    });
    await this.logEngineEvent(actorUserId, 'Limit Resource Created', `Added "${resource.label}" to the resource catalog.`, 'ResourceDefinition', resource.key);
    return resource;
  }

  async updateResource(key: string, dto: UpdateResourceDefinitionDto, actorUserId: string) {
    await this.assertResourceExists(key);
    const resource = await this.prisma.resourceDefinition.update({ where: { key }, data: dto });
    await this.logEngineEvent(actorUserId, 'Limit Resource Updated', `Updated resource "${resource.label}".`, 'ResourceDefinition', key);
    return resource;
  }

  async deleteResource(key: string, actorUserId: string) {
    const resource = await this.assertResourceExists(key);
    const usageCount = await this.prisma.planResourceLimit.count({ where: { resourceKey: key, limitType: { not: 'DISABLED' } } });
    if (usageCount > 0) {
      throw new BadRequestException(`"${resource.label}" still has active limits on ${usageCount} plan(s). Disable it on those plans first.`);
    }
    await this.prisma.resourceDefinition.delete({ where: { key } });
    await this.logEngineEvent(actorUserId, 'Limit Resource Removed', `Removed "${resource.label}" from the resource catalog.`, 'ResourceDefinition', key);
    return { success: true };
  }

  async updateValidationRule(planId: string, resourceKey: string, dto: UpdateValidationRuleDto, actorUserId: string) {
    const limit = await this.prisma.planResourceLimit.findUnique({
      where: { planId_resourceKey: { planId, resourceKey } },
      include: { plan: true, resource: true },
    });
    if (!limit) throw new NotFoundException('This plan has no configured limit for that resource yet.');

    const updated = await this.prisma.planResourceLimit.update({
      where: { id: limit.id },
      data: dto,
      include: { plan: true, resource: true },
    });

    await this.logEngineEvent(
      actorUserId,
      'Validation Rule Changed',
      `Updated validation rule for "${updated.resource.label}" on plan "${updated.plan.name}".`,
      'PlanResourceLimit',
      updated.id,
    );
    return updated;
  }

  // ---------------------------------------------------------------------------
  // MATRICES
  // ---------------------------------------------------------------------------

  async getFeatureMatrix() {
    const [plans, features] = await Promise.all([
      this.prisma.subscriptionPlan.findMany({
        where: { status: { not: 'ARCHIVED' } },
        orderBy: [{ displayOrder: 'asc' }],
        include: { featureAccess: true },
      }),
      this.prisma.featureDefinition.findMany({ orderBy: [{ category: 'asc' }, { label: 'asc' }] }),
    ]);
    return { plans, features };
  }

  async getResourceMatrix() {
    const [plans, resources] = await Promise.all([
      this.prisma.subscriptionPlan.findMany({
        where: { status: { not: 'ARCHIVED' } },
        orderBy: [{ displayOrder: 'asc' }],
        include: { resourceLimits: true },
      }),
      this.prisma.resourceDefinition.findMany({ orderBy: [{ category: 'asc' }, { label: 'asc' }] }),
    ]);
    return { plans, resources };
  }

  // ---------------------------------------------------------------------------
  // WORKSPACE EXPERIENCE
  // ---------------------------------------------------------------------------

  async listWorkspaceExperience() {
    const [plans, overrides] = await Promise.all([
      this.prisma.subscriptionPlan.findMany({
        where: { status: { not: 'ARCHIVED' } },
        orderBy: [{ displayOrder: 'asc' }],
        select: { id: true, name: true, status: true, workspaceExperienceDefault: true, allowExperienceOverride: true },
      }),
      this.prisma.organizationSubscription.findMany({
        where: { status: { in: ACTIVE_SUBSCRIPTION_STATUSES }, workspaceExperienceOverride: { not: null } },
        include: { organization: { select: { id: true, name: true } }, plan: { select: { id: true, name: true, workspaceExperienceDefault: true } } },
      }),
    ]);
    return { plans, organizationOverrides: overrides };
  }

  async setOrganizationWorkspaceExperience(organizationId: string, dto: SetWorkspaceExperienceOverrideDto, actorUserId: string) {
    const subscription = await this.getActiveSubscription(organizationId);
    const updated = await this.prisma.organizationSubscription.update({
      where: { id: subscription.id },
      data: { workspaceExperienceOverride: dto.workspaceExperienceOverride ?? null },
      include: { organization: true },
    });

    await this.logEngineEvent(
      actorUserId,
      'Workspace Experience Overridden',
      dto.workspaceExperienceOverride
        ? `Set workspace experience override to ${dto.workspaceExperienceOverride} for "${updated.organization.name}".`
        : `Cleared workspace experience override for "${updated.organization.name}" (now uses plan default).`,
      'OrganizationSubscription',
      updated.id,
      organizationId,
    );
    return updated;
  }

  // ---------------------------------------------------------------------------
  // ORGANIZATION USAGE
  // ---------------------------------------------------------------------------

  async listOrganizationsUsage(filters: { search?: string; planId?: string }) {
    const where: any = { status: { in: ACTIVE_SUBSCRIPTION_STATUSES } };
    if (filters.planId) where.planId = filters.planId;
    if (filters.search) where.organization = { name: { contains: filters.search, mode: 'insensitive' } };

    const subscriptions = await this.prisma.organizationSubscription.findMany({
      where,
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        plan: { select: { id: true, name: true, status: true } },
      },
      orderBy: { organization: { name: 'asc' } },
    });

    const violations = await this.computeViolations({});
    const violationsByOrg = new Map<string, typeof violations>();
    for (const v of violations) {
      const list = violationsByOrg.get(v.organizationId) || [];
      list.push(v);
      violationsByOrg.set(v.organizationId, list);
    }

    return subscriptions.map((sub) => {
      const orgViolations = violationsByOrg.get(sub.organizationId) || [];
      return {
        subscriptionId: sub.id,
        organization: sub.organization,
        plan: sub.plan,
        status: sub.status,
        workspaceExperienceOverride: sub.workspaceExperienceOverride,
        violationCount: orgViolations.filter((v) => v.severity === 'exceeded').length,
        warningCount: orgViolations.filter((v) => v.severity === 'warning').length,
      };
    });
  }

  async getOrganizationDetail(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!organization) throw new NotFoundException('Organization not found');

    const subscription = await this.getActiveSubscription(organizationId);
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: subscription.planId },
      include: { resourceLimits: { include: { resource: true } }, featureAccess: { include: { feature: true } } },
    });
    if (!plan) throw new NotFoundException('Plan not found for this organization');

    const overrides = await this.prisma.engineOverride.findMany({
      where: { organizationId, status: 'ACTIVE' },
      include: { feature: true, resource: true },
    });
    this.expireStaleOverrides(overrides, organizationId);

    const usage = await Promise.all(
      plan.resourceLimits.map(async (limit) => {
        const override = overrides.find((o) => o.scope === 'RESOURCE' && o.resourceKey === limit.resourceKey);
        const effectiveLimitType = override?.limitType || limit.limitType;
        const effectiveLimitValue = override ? override.limitValue : limit.limitValue;
        const used = await this.getResourceUsage(organizationId, limit.resourceKey);
        return {
          resourceKey: limit.resourceKey,
          label: limit.resource.label,
          unit: limit.resource.unit,
          category: limit.resource.category,
          limitType: effectiveLimitType,
          limitValue: effectiveLimitValue,
          used,
          warningThresholdValue: limit.warningThresholdValue,
          displayUpgradeBanner: limit.displayUpgradeBanner,
          overridden: !!override,
          percentUsed: effectiveLimitType === 'LIMITED' && effectiveLimitValue ? Math.round((used / effectiveLimitValue) * 100) : null,
        };
      }),
    );

    const featureAccess = plan.featureAccess.map((access) => {
      const override = overrides.find((o) => o.scope === 'FEATURE' && o.featureKey === access.featureKey);
      return {
        featureKey: access.featureKey,
        label: access.feature.label,
        category: access.feature.category,
        state: override?.featureState || access.state,
        overridden: !!override,
      };
    });

    const violations = (await this.computeViolations({ organizationId })).filter((v) => v.organizationId === organizationId);

    return {
      organization,
      subscription,
      plan: { id: plan.id, name: plan.name, status: plan.status, workspaceExperienceDefault: plan.workspaceExperienceDefault },
      effectiveWorkspaceExperience: subscription.workspaceExperienceOverride || plan.workspaceExperienceDefault,
      usage,
      featureAccess,
      overrides,
      violations,
      upgradeRecommendation: violations.length > 0 ? await this.getUpgradeRecommendation(organizationId) : null,
    };
  }

  // ---------------------------------------------------------------------------
  // UPGRADE RECOMMENDATIONS
  // ---------------------------------------------------------------------------

  async getUpgradeRecommendation(organizationId: string) {
    const subscription = await this.getActiveSubscription(organizationId);
    const currentPlan = await this.prisma.subscriptionPlan.findUnique({ where: { id: subscription.planId } });
    if (!currentPlan) throw new NotFoundException('Current plan not found');

    const violations = (await this.computeViolations({ organizationId })).filter((v) => v.organizationId === organizationId);
    if (violations.length === 0) return null;

    const candidatePlans = await this.prisma.subscriptionPlan.findMany({
      where: { status: 'ACTIVE', id: { not: currentPlan.id } },
      include: { resourceLimits: true, featureAccess: true },
      orderBy: { price: 'asc' },
    });

    for (const candidate of candidatePlans) {
      const resolvesAll = violations.every((v) => {
        if (v.scope !== 'RESOURCE') return true;
        const candidateLimit = candidate.resourceLimits.find((l) => l.resourceKey === v.resourceKey);
        if (!candidateLimit) return false;
        if (candidateLimit.limitType === 'UNLIMITED') return true;
        if (candidateLimit.limitType === 'DISABLED') return false;
        return (candidateLimit.limitValue ?? 0) > v.used;
      });
      if (resolvesAll) {
        const newLimits = violations
          .filter((v) => v.scope === 'RESOURCE')
          .map((v) => {
            const candidateLimit = candidate.resourceLimits.find((l) => l.resourceKey === v.resourceKey);
            return { resourceKey: v.resourceKey, label: v.label, newLimit: candidateLimit?.limitType === 'UNLIMITED' ? 'Unlimited' : candidateLimit?.limitValue };
          });
        return {
          currentPlan: { id: currentPlan.id, name: currentPlan.name, price: currentPlan.price },
          recommendedPlan: { id: candidate.id, name: candidate.name, price: candidate.price, currency: candidate.currency, billingCycle: candidate.billingCycle },
          reason: `${violations.length} rule(s) currently exceeded on "${currentPlan.name}": ${violations.map((v) => v.label).join(', ')}.`,
          benefits: newLimits,
          newLimits,
          estimatedCost: candidate.price,
        };
      }
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // VIOLATIONS (computed live from real usage vs effective limits)
  // ---------------------------------------------------------------------------

  async computeViolations(filters: { organizationId?: string; severity?: 'warning' | 'exceeded' }) {
    const where: any = { status: { in: ACTIVE_SUBSCRIPTION_STATUSES } };
    if (filters.organizationId) where.organizationId = filters.organizationId;

    const subscriptions = await this.prisma.organizationSubscription.findMany({
      where,
      include: {
        organization: { select: { id: true, name: true } },
        plan: { include: { resourceLimits: { include: { resource: true } } } },
      },
    });

    const overrides = await this.prisma.engineOverride.findMany({ where: { status: 'ACTIVE', scope: 'RESOURCE' } });

    const results: Array<{
      organizationId: string;
      organizationName: string;
      scope: 'RESOURCE';
      resourceKey: string;
      label: string;
      limitValue: number;
      used: number;
      exceededBy: number;
      severity: 'warning' | 'exceeded';
      action: string;
    }> = [];

    for (const sub of subscriptions) {
      for (const limit of sub.plan.resourceLimits) {
        if (limit.limitType !== 'LIMITED') continue;
        const override = overrides.find((o) => o.organizationId === sub.organizationId && o.resourceKey === limit.resourceKey);
        const effectiveLimitValue = override?.limitValue ?? limit.limitValue;
        if (effectiveLimitValue == null) continue;

        const used = await this.getResourceUsage(sub.organizationId, limit.resourceKey);
        if (used > effectiveLimitValue) {
          results.push({
            organizationId: sub.organizationId,
            organizationName: sub.organization.name,
            scope: 'RESOURCE',
            resourceKey: limit.resourceKey,
            label: `Maximum ${limit.resource.label}`,
            limitValue: effectiveLimitValue,
            used,
            exceededBy: used - effectiveLimitValue,
            severity: 'exceeded',
            action: limit.autoSuspendEnabled ? `Auto-suspend after ${limit.graceDays}-day grace period` : 'Recommend upgrade',
          });
        } else if (limit.warningThresholdValue != null && used >= limit.warningThresholdValue) {
          results.push({
            organizationId: sub.organizationId,
            organizationName: sub.organization.name,
            scope: 'RESOURCE',
            resourceKey: limit.resourceKey,
            label: `${limit.resource.label} approaching limit`,
            limitValue: effectiveLimitValue,
            used,
            exceededBy: 0,
            severity: 'warning',
            action: limit.displayUpgradeBanner ? 'Display upgrade banner' : 'Monitor',
          });
        }
      }
    }

    if (filters.severity) return results.filter((r) => r.severity === filters.severity);
    return results;
  }

  // ---------------------------------------------------------------------------
  // OVERRIDES
  // ---------------------------------------------------------------------------

  async listOverrides(filters: { organizationId?: string; status?: string; scope?: string }) {
    const where: any = {};
    if (filters.organizationId) where.organizationId = filters.organizationId;
    if (filters.status) where.status = filters.status;
    if (filters.scope) where.scope = filters.scope;

    const overrides = await this.prisma.engineOverride.findMany({
      where,
      include: {
        organization: { select: { id: true, name: true } },
        feature: true,
        resource: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    this.expireStaleOverrides(overrides);
    return overrides;
  }

  async createOverride(dto: CreateOverrideDto, actorUserId: string) {
    const organization = await this.prisma.organization.findUnique({ where: { id: dto.organizationId } });
    if (!organization) throw new NotFoundException('Organization not found');
    const actorName = await this.getActorName(actorUserId);

    if (dto.scope === 'FEATURE') {
      await this.assertFeatureExists(dto.featureKey!);
    } else {
      await this.assertResourceExists(dto.resourceKey!);
      if (dto.limitType === 'LIMITED' && (dto.limitValue === undefined || dto.limitValue === null)) {
        throw new BadRequestException('limitValue is required when limitType is LIMITED.');
      }
    }

    const override = await this.prisma.engineOverride.create({
      data: {
        organizationId: dto.organizationId,
        scope: dto.scope as any,
        featureKey: dto.scope === 'FEATURE' ? dto.featureKey : undefined,
        resourceKey: dto.scope === 'RESOURCE' ? dto.resourceKey : undefined,
        overrideType: dto.overrideType as any,
        featureState: dto.scope === 'FEATURE' ? (dto.featureState as any) : undefined,
        limitType: dto.scope === 'RESOURCE' ? (dto.limitType as any) : undefined,
        limitValue: dto.scope === 'RESOURCE' && dto.limitType === 'LIMITED' ? dto.limitValue : null,
        reason: dto.reason,
        approverName: dto.approverName,
        createdByUserId: actorUserId,
        createdByName: actorName,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
      include: { organization: true, feature: true, resource: true },
    });

    await this.logEngineEvent(
      actorUserId,
      'Override Added',
      `Added a ${dto.overrideType.toLowerCase()} ${dto.scope.toLowerCase()} override for "${organization.name}": ${dto.reason}`,
      'EngineOverride',
      override.id,
      dto.organizationId,
    );
    return override;
  }

  async revokeOverride(id: string, actorUserId: string) {
    const override = await this.prisma.engineOverride.findUnique({ where: { id }, include: { organization: true } });
    if (!override) throw new NotFoundException('Override not found');
    if (override.status !== 'ACTIVE') throw new BadRequestException('This override is no longer active.');
    const actorName = await this.getActorName(actorUserId);

    const updated = await this.prisma.engineOverride.update({
      where: { id },
      data: { status: 'REVOKED', revokedAt: new Date(), revokedByName: actorName },
    });

    await this.logEngineEvent(
      actorUserId,
      'Override Removed',
      `Revoked override for "${override.organization.name}".`,
      'EngineOverride',
      id,
      override.organizationId,
    );
    return updated;
  }

  // ---------------------------------------------------------------------------
  // EVALUATION - the single source of truth every other module should call
  // ---------------------------------------------------------------------------

  async evaluateFeature(dto: EvaluateFeatureDto) {
    const subscription = await this.getActiveSubscription(dto.organizationId);
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: subscription.planId },
      include: { featureAccess: true },
    });
    if (!plan) throw new NotFoundException('Plan not found for this organization');

    const override = await this.prisma.engineOverride.findFirst({
      where: { organizationId: dto.organizationId, scope: 'FEATURE', featureKey: dto.featureKey, status: 'ACTIVE' },
    });
    const activeOverride = override && !this.isExpired(override) ? override : null;

    const planAccess = plan.featureAccess.find((a) => a.featureKey === dto.featureKey);
    const state = activeOverride?.featureState || planAccess?.state || 'DISABLED';
    const allowed = ['ENABLED', 'BETA', 'ENTERPRISE_ONLY'].includes(state);

    const dependencies = await this.prisma.featureDependency.findMany({
      where: { featureKey: dto.featureKey },
      include: { requiresFeature: true },
    });
    const missingDependencies: string[] = [];
    for (const dep of dependencies) {
      const depAccess = plan.featureAccess.find((a) => a.featureKey === dep.requiresFeatureKey);
      const depAllowed = depAccess && ['ENABLED', 'BETA', 'ENTERPRISE_ONLY'].includes(depAccess.state);
      if (!depAllowed) missingDependencies.push(dep.requiresFeature.label);
    }

    return {
      organizationId: dto.organizationId,
      featureKey: dto.featureKey,
      allowed: allowed && missingDependencies.length === 0,
      state,
      source: activeOverride ? 'override' : 'plan',
      missingDependencies,
      reason: !allowed
        ? `Feature state is ${state} on plan "${plan.name}".`
        : missingDependencies.length > 0
          ? `Missing dependencies: ${missingDependencies.join(', ')}.`
          : 'Allowed.',
    };
  }

  async evaluateResource(dto: EvaluateResourceDto) {
    const requestedAmount = dto.requestedAmount ?? 1;
    const subscription = await this.getActiveSubscription(dto.organizationId);
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: subscription.planId },
      include: { resourceLimits: true },
    });
    if (!plan) throw new NotFoundException('Plan not found for this organization');

    const limit = plan.resourceLimits.find((l) => l.resourceKey === dto.resourceKey);
    const override = await this.prisma.engineOverride.findFirst({
      where: { organizationId: dto.organizationId, scope: 'RESOURCE', resourceKey: dto.resourceKey, status: 'ACTIVE' },
    });
    const activeOverride = override && !this.isExpired(override) ? override : null;

    const limitType = activeOverride?.limitType || limit?.limitType || 'DISABLED';
    const limitValue = activeOverride ? activeOverride.limitValue : limit?.limitValue ?? null;
    const used = await this.getResourceUsage(dto.organizationId, dto.resourceKey);

    let allowed: boolean;
    let warning = false;
    if (limitType === 'DISABLED') {
      allowed = false;
    } else if (limitType === 'UNLIMITED') {
      allowed = true;
    } else {
      allowed = limitValue == null ? false : used + requestedAmount <= limitValue;
      warning = !!limit?.warningThresholdValue && used >= limit.warningThresholdValue;
    }

    return {
      organizationId: dto.organizationId,
      resourceKey: dto.resourceKey,
      allowed,
      warning,
      limitType,
      limitValue,
      used,
      remaining: limitType === 'LIMITED' && limitValue != null ? Math.max(0, limitValue - used) : null,
      source: activeOverride ? 'override' : 'plan',
      reason: allowed ? 'Allowed.' : `Resource "${dto.resourceKey}" is ${limitType === 'DISABLED' ? 'disabled' : 'at its limit'} on plan "${plan.name}".`,
    };
  }

  // ---------------------------------------------------------------------------
  // AUDIT
  // ---------------------------------------------------------------------------

  async getAuditLog(filters: { entityType?: string; organizationId?: string; page?: number; limit?: number }) {
    const engineEntityTypes = ['FeatureDefinition', 'ResourceDefinition', 'FeatureDependency', 'PlanResourceLimit', 'PlanFeatureAccess', 'EngineOverride', 'OrganizationSubscription'];
    const where: any = {
      OR: [{ eventCategory: AUDIT_CATEGORY }, { entityType: { in: engineEntityTypes } }],
    };
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.organizationId) where.organizationId = filters.organizationId;

    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 25;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data: logs, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ---------------------------------------------------------------------------
  // DEVELOPER PREVIEW
  // ---------------------------------------------------------------------------

  async getDeveloperPreview(organizationId: string, featureKey?: string, resourceKey?: string) {
    const subscription = await this.getActiveSubscription(organizationId).catch(() => null);
    const feature = featureKey ? await this.evaluateFeature({ organizationId, featureKey }) : null;
    const resource = resourceKey ? await this.evaluateResource({ organizationId, resourceKey }) : null;

    return {
      request: { organizationId, featureKey, resourceKey },
      configuration: subscription ? { planId: subscription.planId, subscriptionStatus: subscription.status } : null,
      featureEvaluation: feature,
      resourceEvaluation: resource,
      sampleRequests: [
        { method: 'POST', path: '/v1/platform/feature-engine/evaluate/feature', body: { organizationId, featureKey: featureKey || 'workout_programs' } },
        { method: 'POST', path: '/v1/platform/feature-engine/evaluate/resource', body: { organizationId, resourceKey: resourceKey || 'members', requestedAmount: 1 } },
      ],
    };
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private async getActiveSubscription(organizationId: string) {
    const subscription = await this.prisma.organizationSubscription.findFirst({
      where: { organizationId, status: { in: ACTIVE_SUBSCRIPTION_STATUSES } },
      orderBy: { startDate: 'desc' },
    });
    if (!subscription) throw new NotFoundException('This organization has no active subscription.');
    return subscription;
  }

  private async getResourceUsage(organizationId: string, resourceKey: string): Promise<number> {
    const counter = RESOURCE_COUNTERS[resourceKey];
    if (counter) return counter(this.prisma, organizationId);

    const usage = await this.prisma.subscriptionUsage.findFirst({
      where: { featureName: resourceKey, subscription: { organizationId } },
      orderBy: { updatedAt: 'desc' },
    });
    return usage?.currentValue ?? 0;
  }

  private summarizeFeatureStates(planAccess: Array<{ state: string; plan: { status: string } }>) {
    const activeOnly = planAccess.filter((a) => a.plan.status === 'ACTIVE');
    return {
      enabled: activeOnly.filter((a) => a.state === 'ENABLED').length,
      beta: activeOnly.filter((a) => a.state === 'BETA').length,
      enterpriseOnly: activeOnly.filter((a) => a.state === 'ENTERPRISE_ONLY').length,
      disabled: activeOnly.filter((a) => a.state === 'DISABLED').length,
      hidden: activeOnly.filter((a) => a.state === 'HIDDEN').length,
      comingSoon: activeOnly.filter((a) => a.state === 'COMING_SOON').length,
    };
  }

  private summarizeLimits(planLimits: Array<{ limitType: string; plan: { status: string } }>) {
    const activeOnly = planLimits.filter((l) => l.plan.status === 'ACTIVE');
    return {
      limited: activeOnly.filter((l) => l.limitType === 'LIMITED').length,
      unlimited: activeOnly.filter((l) => l.limitType === 'UNLIMITED').length,
      disabled: activeOnly.filter((l) => l.limitType === 'DISABLED').length,
    };
  }

  private isExpired(override: { expiresAt: Date | null }) {
    return !!override.expiresAt && override.expiresAt.getTime() < Date.now();
  }

  private expireStaleOverrides(overrides: Array<{ id: string; status: string; expiresAt: Date | null }>, _organizationId?: string) {
    const staleIds = overrides.filter((o) => o.status === 'ACTIVE' && this.isExpired(o)).map((o) => o.id);
    if (staleIds.length === 0) return;
    this.prisma.engineOverride.updateMany({ where: { id: { in: staleIds } }, data: { status: 'EXPIRED' } }).catch(() => undefined);
    overrides.forEach((o) => {
      if (staleIds.includes(o.id)) o.status = 'EXPIRED';
    });
  }

  private startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private async assertFeatureExists(key: string) {
    const feature = await this.prisma.featureDefinition.findUnique({ where: { key } });
    if (!feature) throw new NotFoundException(`Feature "${key}" not found`);
    return feature;
  }

  private async assertResourceExists(key: string) {
    const resource = await this.prisma.resourceDefinition.findUnique({ where: { key } });
    if (!resource) throw new NotFoundException(`Resource "${key}" not found`);
    return resource;
  }

  private async getActorName(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user?.fullName || 'Platform Admin';
  }

  private async logEngineEvent(actorUserId: string, action: string, details: string, entityType: string, entityId: string, organizationId?: string | null) {
    const actorName = await this.getActorName(actorUserId);
    await this.auditLogsService.logEvent({
      organizationId: organizationId || null,
      userId: actorUserId,
      action,
      user: actorName,
      details,
      eventType: action.toUpperCase().replace(/\s+/g, '_'),
      eventCategory: AUDIT_CATEGORY,
      entityType,
      entityId,
    });
  }
}
