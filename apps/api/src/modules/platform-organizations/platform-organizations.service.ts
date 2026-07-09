import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { SuspendOrganizationDto } from './dto/suspend-organization.dto';
import { BulkActionDto } from './dto/bulk-action.dto';
import { ListOrganizationsDto } from './dto/list-organizations.dto';

const AUDIT_CATEGORY = 'Organization Management';
// "Current" subscription statuses - i.e. the row that represents an org's
// live relationship with the platform, regardless of health. Excludes only
// terminal states (Canceled) so paused/grace/pending orgs are still found as
// the org's current subscription rather than 404-ing platform admin lookups.
const ACTIVE_SUB_STATUSES = ['Active', 'Trialing', 'Past_Due', 'Grace_Period', 'Paused', 'Pending_Payment'];
const DAY = 24 * 60 * 60 * 1000;

// The subscription resource key that best represents "seats" for a usage bar.
const MEMBER_RESOURCE_KEY = 'members';

export type DerivedStatus = 'ACTIVE' | 'TRIAL' | 'GRACE_PERIOD' | 'PAUSED' | 'PENDING_PAYMENT' | 'SUSPENDED' | 'EXPIRED' | 'ARCHIVED';
export type HealthBand = 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';

@Injectable()
export class PlatformOrganizationsService {
  constructor(
    private prisma: DatabaseService,
    private auditLogsService: AuditLogsService,
  ) {}

  // ---------------------------------------------------------------------------
  // LIST (server-side search / filter / sort / pagination)
  // ---------------------------------------------------------------------------

  async list(query: ListOrganizationsDto, actorUserId: string) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

    const where: any = { deletedAt: null };

    if (query.status) where.platformStatus = query.status;
    if (query.country) where.country = query.country;

    if (query.search) {
      const s = query.search;
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { slug: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s, mode: 'insensitive' } },
        { country: { contains: s, mode: 'insensitive' } },
        { gyms: { some: { name: { contains: s, mode: 'insensitive' } } } },
        { users: { some: { user: { fullName: { contains: s, mode: 'insensitive' } } } } },
      ];
    }

    // Subscription-derived filters need a relation constraint.
    if (query.planId) where.subscriptions = { some: { status: { in: ACTIVE_SUB_STATUSES }, planId: query.planId } };
    if (query.trial === 'true') where.subscriptions = { some: { status: { in: ACTIVE_SUB_STATUSES }, trialEndDate: { gte: new Date() } } };

    const sortField = query.sortBy || 'createdAt';
    const sortDir = query.sortDir === 'asc' ? 'asc' : 'desc';
    // Only simple scalar columns are safe to push to the DB; computed fields
    // (health, memberCount) are sorted in-memory after enrichment.
    const dbSortable = ['createdAt', 'name', 'lastActiveAt', 'country'];
    const orderBy = dbSortable.includes(sortField) ? { [sortField]: sortDir } : { createdAt: 'desc' as const };

    const [total, rows] = await Promise.all([
      this.prisma.organization.count({ where }),
      this.prisma.organization.findMany({
        where,
        orderBy,
        // When we need computed sorting we must pull the full filtered set;
        // otherwise page at the DB. Keep it simple: page at DB for scalar sorts.
        skip: dbSortable.includes(sortField) ? (page - 1) * limit : 0,
        take: dbSortable.includes(sortField) ? limit : undefined,
        include: this.listInclude(),
      }),
    ]);

    let enriched = await Promise.all(rows.map((org) => this.enrichOrganization(org)));

    // Post-filters that depend on computed values.
    if (query.subscriptionStatus) enriched = enriched.filter((o) => o.subscriptionStatus === query.subscriptionStatus);
    if (query.derivedStatus) enriched = enriched.filter((o) => o.derivedStatus === query.derivedStatus);
    if (query.experience) enriched = enriched.filter((o) => o.workspaceExperience === query.experience);
    if (query.health) enriched = enriched.filter((o) => o.health.band === query.health);
    if (query.enterprise === 'true') enriched = enriched.filter((o) => o.isEnterprise);
    if (query.minMembers != null) enriched = enriched.filter((o) => o.usage.members.used >= Number(query.minMembers));
    if (query.minBranches != null) enriched = enriched.filter((o) => o.usage.branches.used >= Number(query.minBranches));

    // In-memory sort + page for computed fields.
    let pageItems = enriched;
    let effectiveTotal = total;
    if (!dbSortable.includes(sortField)) {
      const dir = sortDir === 'asc' ? 1 : -1;
      enriched.sort((a, b) => {
        const av = this.computedSortValue(a, sortField);
        const bv = this.computedSortValue(b, sortField);
        return (av - bv) * dir;
      });
      effectiveTotal = enriched.length;
      pageItems = enriched.slice((page - 1) * limit, page * limit);
    } else if (query.subscriptionStatus || query.derivedStatus || query.experience || query.health || query.enterprise || query.minMembers != null || query.minBranches != null) {
      // Computed filters shrank the DB page; report the filtered count honestly.
      effectiveTotal = enriched.length;
      pageItems = enriched.slice(0, limit);
    }

    await this.logEvent(actorUserId, 'Organizations Viewed', `Viewed organization directory (page ${page}).`, null, 'Organization', 'list');

    return { data: pageItems, total: effectiveTotal, page, limit, totalPages: Math.ceil(effectiveTotal / limit) };
  }

  // Enrich a single organization (health, status, usage, owner, plan) — reused
  // by the Organization 360 workspace so its header/hero stays consistent with
  // the list view.
  async getEnriched(id: string): Promise<EnrichedOrg> {
    const org = await this.prisma.organization.findFirst({ where: { id, deletedAt: null }, include: this.listInclude() });
    if (!org) throw new NotFoundException('Organization not found');
    return this.enrichOrganization(org);
  }

  // ---------------------------------------------------------------------------
  // STATS (KPI cards)
  // ---------------------------------------------------------------------------

  async getStats() {
    const orgs = await this.prisma.organization.findMany({ where: { deletedAt: null }, include: this.listInclude() });
    const enriched = await Promise.all(orgs.map((o) => this.enrichOrganization(o)));

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const healthScores = enriched.map((o) => o.health.score);
    const avgHealth = healthScores.length ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length) : 0;

    return {
      total: enriched.length,
      active: enriched.filter((o) => o.derivedStatus === 'ACTIVE').length,
      trial: enriched.filter((o) => o.derivedStatus === 'TRIAL').length,
      suspended: enriched.filter((o) => o.derivedStatus === 'SUSPENDED').length,
      expired: enriched.filter((o) => o.derivedStatus === 'EXPIRED').length,
      enterprise: enriched.filter((o) => o.isEnterprise).length,
      newThisMonth: enriched.filter((o) => new Date(o.createdAt) >= monthStart).length,
      averageHealthScore: avgHealth,
    };
  }

  // ---------------------------------------------------------------------------
  // INSIGHTS
  // ---------------------------------------------------------------------------

  async getInsights() {
    const orgs = await this.prisma.organization.findMany({ where: { deletedAt: null }, include: this.listInclude() });
    const enriched = await Promise.all(orgs.map((o) => this.enrichOrganization(o)));
    const nowDate = new Date();

    const summary = (o: EnrichedOrg) => ({
      id: o.id,
      name: o.name,
      logoUrl: o.logoUrl,
      plan: o.plan?.name ?? null,
      health: o.health,
      derivedStatus: o.derivedStatus,
    });

    const fastestGrowing = [...enriched]
      .filter((o) => o.usage.members.used > 0)
      .sort((a, b) => b.usage.members.used - a.usage.members.used)
      .slice(0, 5)
      .map((o) => ({ ...summary(o), members: o.usage.members.used }));

    const inactive = enriched
      .filter((o) => o.lastActiveAt && nowDate.getTime() - new Date(o.lastActiveAt).getTime() > 14 * DAY)
      .sort((a, b) => new Date(a.lastActiveAt!).getTime() - new Date(b.lastActiveAt!).getTime())
      .slice(0, 5)
      .map((o) => ({ ...summary(o), lastActiveAt: o.lastActiveAt }));

    const nearLimits = enriched
      .filter((o) => o.usage.members.limit != null && o.usage.members.limit > 0 && o.usage.members.used / o.usage.members.limit >= 0.8)
      .sort((a, b) => b.usage.members.used / (b.usage.members.limit || 1) - a.usage.members.used / (a.usage.members.limit || 1))
      .slice(0, 5)
      .map((o) => ({ ...summary(o), members: o.usage.members.used, limit: o.usage.members.limit }));

    const trialExpiringSoon = enriched
      .filter((o) => o.trialEndDate && new Date(o.trialEndDate).getTime() >= nowDate.getTime() && new Date(o.trialEndDate).getTime() - nowDate.getTime() <= 7 * DAY)
      .sort((a, b) => new Date(a.trialEndDate!).getTime() - new Date(b.trialEndDate!).getTime())
      .map((o) => ({ ...summary(o), trialEndDate: o.trialEndDate }));

    const failedPayments = enriched
      .filter((o) => o.paymentStatus === 'FAILED')
      .map((o) => ({ ...summary(o), subscriptionStatus: o.subscriptionStatus }));

    const requiringAttention = enriched
      .filter((o) => o.health.band === 'CRITICAL' || o.health.band === 'WARNING' || o.paymentStatus === 'FAILED')
      .sort((a, b) => a.health.score - b.health.score)
      .slice(0, 6)
      .map((o) => ({ ...summary(o), reasons: o.health.reasons }));

    return { fastestGrowing, inactive, nearLimits, trialExpiringSoon, failedPayments, requiringAttention };
  }

  // ---------------------------------------------------------------------------
  // LIFECYCLE ACTIONS
  // ---------------------------------------------------------------------------

  async suspend(id: string, dto: SuspendOrganizationDto, actorUserId: string) {
    const org = await this.getOrThrow(id);
    if (org.platformStatus === 'SUSPENDED') throw new BadRequestException('Organization is already suspended.');

    const updated = await this.prisma.organization.update({
      where: { id },
      data: { platformStatus: 'SUSPENDED', suspendedAt: new Date(), suspendReason: dto.reason || null },
    });
    await this.logEvent(actorUserId, 'Organization Suspended', `Suspended "${org.name}"${dto.reason ? `: ${dto.reason}` : '.'}`, id, 'Organization', id);
    return updated;
  }

  async activate(id: string, actorUserId: string) {
    const org = await this.getOrThrow(id);
    if (org.platformStatus === 'ACTIVE') throw new BadRequestException('Organization is already active.');

    const updated = await this.prisma.organization.update({
      where: { id },
      data: { platformStatus: 'ACTIVE', suspendedAt: null, suspendReason: null, archivedAt: null },
    });
    await this.logEvent(actorUserId, 'Organization Activated', `Reactivated "${org.name}".`, id, 'Organization', id);
    return updated;
  }

  async archive(id: string, actorUserId: string) {
    const org = await this.getOrThrow(id);
    if (org.platformStatus === 'ARCHIVED') throw new BadRequestException('Organization is already archived.');

    const updated = await this.prisma.organization.update({
      where: { id },
      data: { platformStatus: 'ARCHIVED', archivedAt: new Date() },
    });
    await this.logEvent(actorUserId, 'Organization Archived', `Archived "${org.name}".`, id, 'Organization', id);
    return updated;
  }

  async impersonate(id: string, actorUserId: string, actorRole: string) {
    const org = await this.prisma.organization.findFirst({
      where: { id, deletedAt: null },
      include: { users: { where: { isActive: true }, include: { user: true, role: true } } },
    });
    if (!org) throw new NotFoundException('Organization not found');
    if (org.platformStatus !== 'ACTIVE') throw new BadRequestException('Only active organizations can be impersonated.');

    const owner = org.users.find((u) => u.role?.name === 'Organization Owner') ?? org.users[0];

    await this.logEvent(actorUserId, 'Organization Impersonated', `Started an impersonation session for "${org.name}".`, id, 'Organization', id);

    // NOTE: minting a real cross-tenant session token is handled in the
    // Organization 360 story (PLT-005). Here we return the impersonation
    // context and record the audited intent.
    return {
      organizationId: org.id,
      organizationName: org.name,
      slug: org.slug,
      owner: owner ? { id: owner.user.id, name: owner.user.fullName, email: owner.user.email } : null,
      impersonatedByRole: actorRole,
      startedAt: new Date().toISOString(),
      workspaceUrl: `/?org=${org.slug}`,
    };
  }

  async bulk(dto: BulkActionDto, actorUserId: string) {
    if (!dto.organizationIds?.length) throw new BadRequestException('No organizations selected.');
    const orgs = await this.prisma.organization.findMany({ where: { id: { in: dto.organizationIds }, deletedAt: null } });
    if (orgs.length === 0) throw new NotFoundException('No matching organizations found.');

    let affected = 0;
    switch (dto.action) {
      case 'suspend':
        affected = (await this.prisma.organization.updateMany({
          where: { id: { in: dto.organizationIds }, platformStatus: { not: 'SUSPENDED' } },
          data: { platformStatus: 'SUSPENDED', suspendedAt: new Date(), suspendReason: dto.reason || 'Bulk suspension.' },
        })).count;
        break;
      case 'activate':
        affected = (await this.prisma.organization.updateMany({
          where: { id: { in: dto.organizationIds }, platformStatus: { not: 'ACTIVE' } },
          data: { platformStatus: 'ACTIVE', suspendedAt: null, suspendReason: null, archivedAt: null },
        })).count;
        break;
      case 'archive':
        affected = (await this.prisma.organization.updateMany({
          where: { id: { in: dto.organizationIds }, platformStatus: { not: 'ARCHIVED' } },
          data: { platformStatus: 'ARCHIVED', archivedAt: new Date() },
        })).count;
        break;
      case 'assign_plan': {
        if (!dto.planId) throw new BadRequestException('planId is required to assign a plan.');
        const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: dto.planId } });
        if (!plan) throw new NotFoundException('Plan not found.');
        for (const org of orgs) {
          const sub = await this.prisma.organizationSubscription.findFirst({
            where: { organizationId: org.id, status: { in: ACTIVE_SUB_STATUSES } },
            orderBy: { startDate: 'desc' },
          });
          if (sub) {
            await this.prisma.organizationSubscription.update({ where: { id: sub.id }, data: { planId: plan.id } });
            affected++;
          }
        }
        break;
      }
      case 'notify':
        // Notifications aren't wired to a delivery channel yet; the action is
        // recorded in the audit trail so the intent is captured honestly.
        affected = orgs.length;
        break;
      default:
        throw new BadRequestException(`Unsupported bulk action "${dto.action}".`);
    }

    await this.logEvent(
      actorUserId,
      'Organizations Bulk Action',
      `Bulk "${dto.action}" applied to ${affected} of ${dto.organizationIds.length} organization(s).`,
      null,
      'Organization',
      'bulk',
    );
    return { action: dto.action, requested: dto.organizationIds.length, affected };
  }

  async recordExport(actorUserId: string, format: string, count: number) {
    await this.logEvent(actorUserId, 'Organizations Exported', `Exported ${count} organization(s) as ${format.toUpperCase()}.`, null, 'Organization', 'export');
    return { ok: true };
  }

  listCountries() {
    return this.prisma.organization
      .findMany({ where: { deletedAt: null, country: { not: null } }, select: { country: true }, distinct: ['country'], orderBy: { country: 'asc' } })
      .then((rows) => rows.map((r) => r.country).filter(Boolean));
  }

  // ---------------------------------------------------------------------------
  // ENRICHMENT + HEALTH SCORING
  // ---------------------------------------------------------------------------

  private listInclude() {
    return {
      _count: { select: { gyms: true, members: true, users: true } },
      users: { where: { isActive: true }, include: { user: true, role: true } },
      subscriptions: {
        include: {
          plan: {
            include: {
              resourceLimits: true,
              featureAccess: true,
            },
          },
          invoices: { include: { payments: true }, orderBy: { createdAt: 'desc' as const }, take: 5 },
        },
        orderBy: { startDate: 'desc' as const },
      },
    };
  }

  private async enrichOrganization(org: any): Promise<EnrichedOrg> {
    const activeSub = org.subscriptions.find((s: any) => ACTIVE_SUB_STATUSES.includes(s.status)) ?? org.subscriptions[0] ?? null;
    const plan = activeSub?.plan ?? null;

    const owner = org.users.find((u: any) => u.role?.name === 'Organization Owner') ?? org.users[0] ?? null;

    const memberLimit = this.limitFor(plan, MEMBER_RESOURCE_KEY);
    const branchLimit = this.limitFor(plan, 'branches');
    const userLimit = this.limitFor(plan, 'organization_users');
    const storageLimit = this.limitFor(plan, 'storage'); // GB

    const subscriptionStatus: string = activeSub?.status ?? 'None';
    const derivedStatus = this.deriveStatus(org, activeSub);
    const paymentStatus = this.derivePaymentStatus(activeSub);
    const isEnterprise = plan?.billingCycle === 'ENTERPRISE' || plan?.internalCode === 'enterprise';
    const workspaceExperience = activeSub?.workspaceExperienceOverride ?? plan?.workspaceExperienceDefault ?? 'ESSENTIAL';

    const usage = {
      members: { used: org._count.members, limit: memberLimit },
      branches: { used: org._count.gyms, limit: branchLimit },
      users: { used: org._count.users, limit: userLimit },
      // Storage isn't metered from a real store yet; report 0 used honestly.
      storage: { used: 0, limit: storageLimit, unit: 'GB' },
    };

    const health = this.computeHealth({ org, derivedStatus, paymentStatus, usage, plan });

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logoUrl: org.logoUrl,
      businessType: org.businessType,
      country: org.country,
      timezone: org.timezone,
      email: org.email,
      phone: org.phone,
      platformStatus: org.platformStatus,
      createdAt: org.createdAt,
      lastActiveAt: org.lastActiveAt,
      suspendReason: org.suspendReason,
      owner: owner ? { id: owner.user.id, name: owner.user.fullName, email: owner.user.email, phone: owner.user.phoneNumber } : null,
      plan: plan ? { id: plan.id, name: plan.name, billingCycle: plan.billingCycle } : null,
      subscriptionStatus,
      derivedStatus,
      paymentStatus,
      isEnterprise,
      workspaceExperience,
      trialEndDate: activeSub?.trialEndDate ?? null,
      subscriptionEndDate: activeSub?.endDate ?? null,
      usage,
      health,
    };
  }

  private limitFor(plan: any, resourceKey: string): number | null {
    if (!plan?.resourceLimits) return null;
    const limit = plan.resourceLimits.find((l: any) => l.resourceKey === resourceKey);
    if (!limit) return null;
    if (limit.limitType === 'UNLIMITED') return null; // null limit = unlimited
    if (limit.limitType === 'DISABLED') return 0;
    return limit.limitValue;
  }

  private deriveStatus(org: any, activeSub: any): DerivedStatus {
    if (org.platformStatus === 'ARCHIVED') return 'ARCHIVED';
    if (org.platformStatus === 'SUSPENDED') return 'SUSPENDED';
    if (!activeSub) return 'EXPIRED';
    if (activeSub.status === 'Canceled') return 'EXPIRED';
    if (activeSub.status === 'Paused') return 'PAUSED';
    if (activeSub.status === 'Grace_Period') return 'GRACE_PERIOD';
    if (activeSub.status === 'Pending_Payment') return 'PENDING_PAYMENT';
    if (activeSub.trialEndDate && new Date(activeSub.trialEndDate) >= new Date() && activeSub.status === 'Trialing') return 'TRIAL';
    if (activeSub.endDate && new Date(activeSub.endDate) < new Date()) return 'EXPIRED';
    return 'ACTIVE';
  }

  private derivePaymentStatus(activeSub: any): 'PAID' | 'FAILED' | 'NONE' {
    if (!activeSub?.invoices?.length) return 'NONE';
    const hasFailed = activeSub.invoices.some(
      (inv: any) => inv.status === 'Unpaid' || (inv.payments || []).some((p: any) => p.status === 'Failed'),
    );
    if (hasFailed) return 'FAILED';
    return activeSub.invoices.some((inv: any) => inv.status === 'Paid') ? 'PAID' : 'NONE';
  }

  // Composite 0-100 health score from the signals the platform actually has
  // real data for: subscription status, recent activity, payment status,
  // limit proximity and feature adoption. Missing signals (API errors,
  // storage) are simply not penalized rather than faked.
  private computeHealth({ org, derivedStatus, paymentStatus, usage, plan }: any): { score: number; band: HealthBand; reasons: string[] } {
    let score = 100;
    const reasons: string[] = [];

    if (derivedStatus === 'SUSPENDED') { score -= 55; reasons.push('Organization is suspended'); }
    else if (derivedStatus === 'EXPIRED') { score -= 45; reasons.push('Subscription expired'); }
    else if (derivedStatus === 'ARCHIVED') { score -= 60; reasons.push('Organization is archived'); }
    else if (derivedStatus === 'TRIAL') { score -= 8; reasons.push('On trial'); }

    if (paymentStatus === 'FAILED') { score -= 25; reasons.push('Failed / overdue payment'); }

    const lastActive = org.lastActiveAt ? new Date(org.lastActiveAt).getTime() : null;
    if (lastActive) {
      const idleDays = (Date.now() - lastActive) / DAY;
      if (idleDays > 30) { score -= 25; reasons.push('No activity in 30+ days'); }
      else if (idleDays > 14) { score -= 15; reasons.push('No activity in 14+ days'); }
      else if (idleDays > 7) { score -= 6; reasons.push('Low recent activity'); }
    } else {
      score -= 10;
      reasons.push('No recorded activity');
    }

    if (usage.members.limit && usage.members.limit > 0) {
      const ratio = usage.members.used / usage.members.limit;
      if (ratio >= 1) { score -= 12; reasons.push('At or over member limit'); }
      else if (ratio >= 0.85) { score -= 6; reasons.push('Approaching member limit'); }
    }

    // Feature adoption: share of the plan's grantable features that are enabled.
    if (plan?.featureAccess?.length) {
      const grantable = plan.featureAccess.length;
      const enabled = plan.featureAccess.filter((f: any) => ['ENABLED', 'BETA', 'ENTERPRISE_ONLY'].includes(f.state)).length;
      const adoption = enabled / grantable;
      if (adoption < 0.35) { score -= 8; reasons.push('Low feature adoption'); }
    }

    score = Math.max(0, Math.min(100, Math.round(score)));
    const band: HealthBand = score >= 85 ? 'EXCELLENT' : score >= 65 ? 'GOOD' : score >= 45 ? 'WARNING' : 'CRITICAL';
    if (reasons.length === 0) reasons.push('All signals healthy');
    return { score, band, reasons };
  }

  private computedSortValue(o: EnrichedOrg, field: string): number {
    switch (field) {
      case 'health': return o.health.score;
      case 'members': return o.usage.members.used;
      case 'branches': return o.usage.branches.used;
      default: return new Date(o.createdAt).getTime();
    }
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private async getOrThrow(id: string) {
    const org = await this.prisma.organization.findFirst({ where: { id, deletedAt: null } });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  private async getActorName(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user?.fullName || 'Platform Admin';
  }

  private async logEvent(actorUserId: string, action: string, details: string, organizationId: string | null, entityType: string, entityId: string) {
    const actorName = await this.getActorName(actorUserId);
    await this.auditLogsService.logEvent({
      organizationId,
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

export interface EnrichedOrg {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  businessType: string | null;
  country: string | null;
  timezone: string | null;
  email: string | null;
  phone: string | null;
  platformStatus: string;
  createdAt: Date;
  lastActiveAt: Date | null;
  suspendReason: string | null;
  owner: { id: string; name: string; email: string | null; phone: string } | null;
  plan: { id: string; name: string; billingCycle: string } | null;
  subscriptionStatus: string;
  derivedStatus: DerivedStatus;
  paymentStatus: 'PAID' | 'FAILED' | 'NONE';
  isEnterprise: boolean;
  workspaceExperience: string;
  trialEndDate: Date | null;
  subscriptionEndDate: Date | null;
  usage: {
    members: { used: number; limit: number | null };
    branches: { used: number; limit: number | null };
    users: { used: number; limit: number | null };
    storage: { used: number; limit: number | null; unit: string };
  };
  health: { score: number; band: HealthBand; reasons: string[] };
}
