import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PlanChangeType } from '@gym/database';
import { DatabaseService } from '../../core/database/database.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { DuplicatePlanDto } from './dto/duplicate-plan.dto';
import { ResourceLimitInputDto } from './dto/resource-limit-input.dto';

const MONTHLY_MULTIPLIER: Record<string, number> = {
  FREE: 0,
  MONTHLY: 1,
  QUARTERLY: 1 / 3,
  HALF_YEARLY: 1 / 6,
  YEARLY: 1 / 12,
  ENTERPRISE: 1,
  CUSTOM: 1,
};

const PLAN_DETAIL_INCLUDE = {
  resourceLimits: { include: { resource: true } },
  featureAccess: { include: { feature: true } },
  upgradePathsFrom: { include: { toPlan: { select: { id: true, name: true, status: true } } } },
  organizationSubscriptions: {
    where: { status: 'Active' as const },
    include: { organization: { select: { id: true, name: true, slug: true } } },
    orderBy: { startDate: 'desc' as const },
  },
};

@Injectable()
export class PlatformPlansService {
  constructor(
    private prisma: DatabaseService,
    private auditLogsService: AuditLogsService,
  ) {}

  // ---------------------------------------------------------------------------
  // CATALOGS
  // ---------------------------------------------------------------------------

  listResourceCatalog() {
    return this.prisma.resourceDefinition.findMany({ orderBy: [{ category: 'asc' }, { label: 'asc' }] });
  }

  listFeatureCatalog() {
    return this.prisma.featureDefinition.findMany({ orderBy: [{ category: 'asc' }, { label: 'asc' }] });
  }

  // ---------------------------------------------------------------------------
  // STATS
  // ---------------------------------------------------------------------------

  async getStats() {
    const [totalPlans, activePlans, draftPlans, plans] = await Promise.all([
      this.prisma.subscriptionPlan.count(),
      this.prisma.subscriptionPlan.count({ where: { status: 'ACTIVE' } }),
      this.prisma.subscriptionPlan.count({ where: { status: 'DRAFT' } }),
      this.prisma.subscriptionPlan.findMany({
        include: { _count: { select: { organizationSubscriptions: { where: { status: 'Active' } } } } },
      }),
    ]);

    let organizationsUsingPlans = 0;
    let mrrByPlan = 0;
    let mostPopularPlan: { id: string; name: string; organizationCount: number } | null = null;

    for (const plan of plans) {
      const orgCount = plan._count.organizationSubscriptions;
      organizationsUsingPlans += orgCount;
      mrrByPlan += plan.price * (MONTHLY_MULTIPLIER[plan.billingCycle] ?? 1) * orgCount;
      if (!mostPopularPlan || orgCount > mostPopularPlan.organizationCount) {
        mostPopularPlan = { id: plan.id, name: plan.name, organizationCount: orgCount };
      }
    }

    return {
      totalPlans,
      activePlans,
      draftPlans,
      organizationsUsingPlans,
      mostPopularPlan,
      mrrByPlan: Math.round(mrrByPlan * 100) / 100,
    };
  }

  // ---------------------------------------------------------------------------
  // LIST / DETAIL
  // ---------------------------------------------------------------------------

  async listPlans(filters: { search?: string; status?: string; visibility?: string; billingCycle?: string }) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.visibility) where.visibility = filters.visibility;
    if (filters.billingCycle) where.billingCycle = filters.billingCycle;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { internalCode: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const plans = await this.prisma.subscriptionPlan.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: { select: { organizationSubscriptions: { where: { status: 'Active' } } } },
      },
    });

    return plans.map(({ _count, ...plan }) => ({ ...plan, organizationCount: _count.organizationSubscriptions }));
  }

  async getPlan(id: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
      include: PLAN_DETAIL_INCLUDE,
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return plan;
  }

  // ---------------------------------------------------------------------------
  // PUBLIC (unauthenticated - marketing/landing page)
  // ---------------------------------------------------------------------------

  async listPublicPlans() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { status: 'ACTIVE', visibility: 'PUBLIC' },
      orderBy: [{ displayOrder: 'asc' }, { price: 'asc' }],
      select: {
        id: true,
        name: true,
        description: true,
        badge: true,
        displayOrder: true,
        price: true,
        currency: true,
        billingCycle: true,
        trialDays: true,
        setupFee: true,
        featureAccess: {
          where: { state: 'ENABLED' },
          select: {
            feature: { select: { key: true, label: true, category: true, description: true } },
          },
        },
        resourceLimits: {
          select: {
            limitType: true,
            limitValue: true,
            resource: { select: { key: true, label: true, unit: true, category: true } },
          },
        },
      },
    });

    return plans.map(({ featureAccess, resourceLimits, ...plan }) => ({
      ...plan,
      features: featureAccess.map((fa) => fa.feature),
      limits: resourceLimits.map((rl) => ({
        ...rl.resource,
        limitType: rl.limitType,
        limitValue: rl.limitValue,
      })),
    }));
  }

  // ---------------------------------------------------------------------------
  // MUTATIONS
  // ---------------------------------------------------------------------------

  async createPlan(dto: CreatePlanDto, actorUserId: string) {
    await this.assertNoDuplicatePricing(dto.name, dto.billingCycle, dto.price, dto.currency || 'USD');
    const actorName = await this.getActorName(actorUserId);

    const plan = await this.prisma
      .$transaction(async (tx) => {
        if (dto.isDefault) {
          await tx.subscriptionPlan.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
        }

        const created = await tx.subscriptionPlan.create({
          data: {
            name: dto.name,
            internalCode: dto.internalCode,
            description: dto.description,
            badge: dto.badge,
            displayOrder: dto.displayOrder ?? 0,
            status: dto.status ?? 'DRAFT',
            visibility: dto.visibility ?? 'PUBLIC',
            price: dto.price,
            currency: dto.currency ?? 'USD',
            billingCycle: dto.billingCycle,
            trialDays: dto.trialDays ?? 0,
            setupFee: dto.setupFee,
            taxIncluded: dto.taxIncluded ?? false,
            isDefault: dto.isDefault ?? false,
            workspaceExperienceDefault: dto.workspaceExperienceDefault ?? 'ESSENTIAL',
            allowExperienceOverride: dto.allowExperienceOverride ?? true,
            brandingAllowed: dto.brandingAllowed ?? false,
            brandingConfig: dto.brandingConfig ? { ...dto.brandingConfig } : undefined,
            downgradeAllowed: dto.downgradeAllowed ?? true,
            autoUpgrade: dto.autoUpgrade ?? false,
            gracePeriodDays: dto.gracePeriodDays ?? 0,
            trialConversionPlanId: dto.trialConversionPlanId,
            resourceLimits: dto.resourceLimits?.length
              ? { create: dto.resourceLimits.map((r) => this.toResourceLimitCreate(r)) }
              : undefined,
            featureAccess: dto.featureAccess?.length
              ? { create: dto.featureAccess.map((f) => ({ featureKey: f.featureKey, state: f.state })) }
              : undefined,
          },
        });

        if (dto.upgradeableToPlanIds?.length) {
          await tx.planUpgradePath.createMany({
            data: dto.upgradeableToPlanIds.map((toPlanId) => ({ fromPlanId: created.id, toPlanId })),
            skipDuplicates: true,
          });
        }

        await tx.planVersionHistory.create({
          data: {
            planId: created.id,
            version: 1,
            changeType: PlanChangeType.CREATED,
            summary: `Plan "${created.name}" created.`,
            changedByUserId: actorUserId,
          },
        });

        return created;
      })
      .catch((err) => this.rethrowUniqueConstraint(err, dto.internalCode));

    await this.auditLogsService.logEvent({
      organizationId: null,
      userId: actorUserId,
      action: 'Plan Created',
      user: actorName,
      details: `Created subscription plan "${plan.name}" (${plan.internalCode}).`,
      eventType: 'PLAN_CREATED',
      eventCategory: 'Commercial',
      entityType: 'SubscriptionPlan',
      entityId: plan.id,
    });

    return this.getPlan(plan.id);
  }

  async updatePlan(id: string, dto: UpdatePlanDto, actorUserId: string) {
    const existing = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Plan not found');
    }

    const nextName = dto.name ?? existing.name;
    const nextCycle = dto.billingCycle ?? existing.billingCycle;
    const nextPrice = dto.price ?? existing.price;
    const nextCurrency = dto.currency ?? existing.currency;
    if (dto.name !== undefined || dto.billingCycle !== undefined || dto.price !== undefined || dto.currency !== undefined) {
      await this.assertNoDuplicatePricing(nextName, nextCycle, nextPrice, nextCurrency, id);
    }

    const pricingFields: (keyof UpdatePlanDto)[] = ['price', 'currency', 'billingCycle', 'setupFee', 'taxIncluded', 'trialDays'];
    const changedFields: string[] = [];
    let changeType: PlanChangeType = PlanChangeType.UPDATED;

    for (const field of pricingFields) {
      if (dto[field] !== undefined && dto[field] !== (existing as any)[field]) {
        changedFields.push(field);
        changeType = PlanChangeType.PRICING_CHANGED;
      }
    }
    if (dto.resourceLimits) {
      changedFields.push('resourceLimits');
      if (changeType === PlanChangeType.UPDATED) changeType = PlanChangeType.LIMIT_CHANGED;
    }
    if (dto.featureAccess) {
      changedFields.push('featureAccess');
      if (changeType === PlanChangeType.UPDATED) changeType = PlanChangeType.FEATURE_CHANGED;
    }
    for (const field of ['name', 'description', 'badge', 'status', 'visibility', 'displayOrder'] as const) {
      if (dto[field] !== undefined && dto[field] !== (existing as any)[field]) {
        changedFields.push(field);
      }
    }

    const actorName = await this.getActorName(actorUserId);
    const nextVersion = existing.version + 1;

    const updated = await this.prisma
      .$transaction(async (tx) => {
        if (dto.isDefault) {
          await tx.subscriptionPlan.updateMany({ where: { isDefault: true, id: { not: id } }, data: { isDefault: false } });
        }
        if (dto.resourceLimits) {
          await tx.planResourceLimit.deleteMany({ where: { planId: id } });
        }
        if (dto.featureAccess) {
          await tx.planFeatureAccess.deleteMany({ where: { planId: id } });
        }
        if (dto.upgradeableToPlanIds) {
          await tx.planUpgradePath.deleteMany({ where: { fromPlanId: id } });
        }

        const result = await tx.subscriptionPlan.update({
          where: { id },
          data: {
            name: dto.name,
            internalCode: dto.internalCode,
            description: dto.description,
            badge: dto.badge,
            displayOrder: dto.displayOrder,
            status: dto.status,
            visibility: dto.visibility,
            price: dto.price,
            currency: dto.currency,
            billingCycle: dto.billingCycle,
            trialDays: dto.trialDays,
            setupFee: dto.setupFee,
            taxIncluded: dto.taxIncluded,
            isDefault: dto.isDefault,
            workspaceExperienceDefault: dto.workspaceExperienceDefault,
            allowExperienceOverride: dto.allowExperienceOverride,
            brandingAllowed: dto.brandingAllowed,
            brandingConfig: dto.brandingConfig ? { ...dto.brandingConfig } : undefined,
            downgradeAllowed: dto.downgradeAllowed,
            autoUpgrade: dto.autoUpgrade,
            gracePeriodDays: dto.gracePeriodDays,
            trialConversionPlanId: dto.trialConversionPlanId,
            version: changedFields.length > 0 ? nextVersion : undefined,
            resourceLimits: dto.resourceLimits?.length
              ? { create: dto.resourceLimits.map((r) => this.toResourceLimitCreate(r)) }
              : undefined,
            featureAccess: dto.featureAccess?.length
              ? { create: dto.featureAccess.map((f) => ({ featureKey: f.featureKey, state: f.state })) }
              : undefined,
          },
        });

        if (dto.upgradeableToPlanIds?.length) {
          await tx.planUpgradePath.createMany({
            data: dto.upgradeableToPlanIds.map((toPlanId) => ({ fromPlanId: id, toPlanId })),
            skipDuplicates: true,
          });
        }

        if (changedFields.length > 0) {
          await tx.planVersionHistory.create({
            data: {
              planId: id,
              version: nextVersion,
              changeType,
              summary: `Updated: ${changedFields.join(', ')}.`,
              changedByUserId: actorUserId,
            },
          });
        }

        return result;
      })
      .catch((err) => this.rethrowUniqueConstraint(err, dto.internalCode));

    if (changedFields.length > 0) {
      await this.auditLogsService.logEvent({
        organizationId: null,
        userId: actorUserId,
        action: 'Plan Updated',
        user: actorName,
        details: `Updated subscription plan "${updated.name}": ${changedFields.join(', ')}.`,
        eventType: 'PLAN_UPDATED',
        eventCategory: 'Commercial',
        entityType: 'SubscriptionPlan',
        entityId: id,
      });
    }

    return this.getPlan(id);
  }

  async duplicatePlan(id: string, dto: DuplicatePlanDto, actorUserId: string) {
    const source = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
      include: { resourceLimits: true, featureAccess: true },
    });
    if (!source) {
      throw new NotFoundException('Plan not found');
    }

    const isVersion = dto.mode === 'version';
    const baseCode = isVersion ? `${source.internalCode}-v${source.version + 1}` : `${source.internalCode}-copy`;
    let internalCode = baseCode;
    let suffix = 2;
    while (await this.prisma.subscriptionPlan.findUnique({ where: { internalCode } })) {
      internalCode = `${baseCode}-${suffix}`;
      suffix++;
    }

    const actorName = await this.getActorName(actorUserId);

    const created = await this.prisma.$transaction(async (tx) => {
      const plan = await tx.subscriptionPlan.create({
        data: {
          name: isVersion ? source.name : `${source.name} (Copy)`,
          internalCode,
          description: source.description,
          badge: source.badge,
          displayOrder: source.displayOrder,
          status: 'DRAFT',
          visibility: source.visibility,
          price: source.price,
          currency: source.currency,
          billingCycle: source.billingCycle,
          trialDays: source.trialDays,
          setupFee: source.setupFee,
          taxIncluded: source.taxIncluded,
          isDefault: false,
          version: isVersion ? source.version + 1 : 1,
          workspaceExperienceDefault: source.workspaceExperienceDefault,
          allowExperienceOverride: source.allowExperienceOverride,
          brandingAllowed: source.brandingAllowed,
          brandingConfig: source.brandingConfig ?? undefined,
          downgradeAllowed: source.downgradeAllowed,
          autoUpgrade: source.autoUpgrade,
          gracePeriodDays: source.gracePeriodDays,
          resourceLimits: {
            create: source.resourceLimits.map((r) => ({
              resourceKey: r.resourceKey,
              limitType: r.limitType,
              limitValue: r.limitValue,
            })),
          },
          featureAccess: {
            create: source.featureAccess.map((f) => ({ featureKey: f.featureKey, state: f.state })),
          },
        },
      });

      await tx.planVersionHistory.create({
        data: {
          planId: plan.id,
          version: plan.version,
          changeType: PlanChangeType.CREATED,
          summary: isVersion ? `Created as version ${plan.version} of "${source.name}".` : `Duplicated from "${source.name}".`,
          changedByUserId: actorUserId,
        },
      });

      return plan;
    });

    await this.auditLogsService.logEvent({
      organizationId: null,
      userId: actorUserId,
      action: 'Plan Duplicated',
      user: actorName,
      details: `Duplicated "${source.name}" as "${created.name}" (${isVersion ? 'new version' : 'clone'}).`,
      eventType: 'PLAN_DUPLICATED',
      eventCategory: 'Commercial',
      entityType: 'SubscriptionPlan',
      entityId: created.id,
    });

    return this.getPlan(created.id);
  }

  async archivePlan(id: string, actorUserId: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
      include: { _count: { select: { organizationSubscriptions: { where: { status: 'Active' } } } } },
    });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }
    if (plan.isDefault) {
      throw new BadRequestException('Cannot archive the default plan. Set another plan as default first.');
    }
    if (plan._count.organizationSubscriptions > 0) {
      throw new BadRequestException(
        `Cannot archive "${plan.name}" - ${plan._count.organizationSubscriptions} organization(s) are still actively subscribed. Migrate them to another plan first.`,
      );
    }

    const actorName = await this.getActorName(actorUserId);

    await this.prisma.$transaction([
      this.prisma.subscriptionPlan.update({ where: { id }, data: { status: 'ARCHIVED', archivedAt: new Date() } }),
      this.prisma.planVersionHistory.create({
        data: {
          planId: id,
          version: plan.version,
          changeType: PlanChangeType.ARCHIVED,
          summary: `Plan "${plan.name}" archived.`,
          changedByUserId: actorUserId,
        },
      }),
    ]);

    await this.auditLogsService.logEvent({
      organizationId: null,
      userId: actorUserId,
      action: 'Plan Archived',
      user: actorName,
      details: `Archived subscription plan "${plan.name}".`,
      eventType: 'PLAN_ARCHIVED',
      eventCategory: 'Commercial',
      entityType: 'SubscriptionPlan',
      entityId: id,
    });

    return this.getPlan(id);
  }

  async activatePlan(id: string, actorUserId: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const wasArchived = plan.status === 'ARCHIVED';
    const actorName = await this.getActorName(actorUserId);

    await this.prisma.$transaction([
      this.prisma.subscriptionPlan.update({ where: { id }, data: { status: 'ACTIVE', archivedAt: null } }),
      this.prisma.planVersionHistory.create({
        data: {
          planId: id,
          version: plan.version,
          changeType: wasArchived ? PlanChangeType.RESTORED : PlanChangeType.UPDATED,
          summary: wasArchived ? `Plan "${plan.name}" restored from archive.` : `Plan "${plan.name}" activated.`,
          changedByUserId: actorUserId,
        },
      }),
    ]);

    await this.auditLogsService.logEvent({
      organizationId: null,
      userId: actorUserId,
      action: wasArchived ? 'Plan Restored' : 'Plan Activated',
      user: actorName,
      details: `${wasArchived ? 'Restored' : 'Activated'} subscription plan "${plan.name}".`,
      eventType: wasArchived ? 'PLAN_RESTORED' : 'PLAN_ACTIVATED',
      eventCategory: 'Commercial',
      entityType: 'SubscriptionPlan',
      entityId: id,
    });

    return this.getPlan(id);
  }

  // ---------------------------------------------------------------------------
  // VERSION HISTORY / AUDIT LOG
  // ---------------------------------------------------------------------------

  async getVersionHistory(id: string) {
    await this.assertPlanExists(id);
    return this.prisma.planVersionHistory.findMany({ where: { planId: id }, orderBy: { createdAt: 'desc' } });
  }

  async getAuditLog(id: string) {
    await this.assertPlanExists(id);
    return this.prisma.auditLog.findMany({
      where: { entityType: 'SubscriptionPlan', entityId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private async assertPlanExists(id: string) {
    const exists = await this.prisma.subscriptionPlan.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      throw new NotFoundException('Plan not found');
    }
  }

  private async assertNoDuplicatePricing(name: string, billingCycle: string, price: number, currency: string, excludePlanId?: string) {
    const duplicate = await this.prisma.subscriptionPlan.findFirst({
      where: {
        name,
        billingCycle: billingCycle as any,
        price,
        currency,
        status: { not: 'ARCHIVED' },
        ...(excludePlanId ? { id: { not: excludePlanId } } : {}),
      },
    });

    if (duplicate) {
      throw new BadRequestException(
        `A plan named "${name}" already exists with identical pricing (${currency} ${price} / ${billingCycle}). Choose a different name or price.`,
      );
    }
  }

  private toResourceLimitCreate(r: ResourceLimitInputDto) {
    if (r.limitType === 'LIMITED' && (r.limitValue === undefined || r.limitValue === null)) {
      throw new BadRequestException(`Resource "${r.resourceKey}" requires a limitValue when limitType is LIMITED`);
    }
    return {
      resourceKey: r.resourceKey,
      limitType: r.limitType,
      limitValue: r.limitType === 'LIMITED' ? r.limitValue : null,
    };
  }

  private async getActorName(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user?.fullName || 'Platform Admin';
  }

  private rethrowUniqueConstraint(err: any, internalCode?: string): never {
    if (err.code === 'P2002') {
      throw new BadRequestException(`Internal code "${internalCode}" is already in use`);
    }
    throw err;
  }
}
