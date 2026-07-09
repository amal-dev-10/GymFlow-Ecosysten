import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PlatformOrganizationsService } from './platform-organizations.service';
import { PlatformCouponsService } from '../platform-coupons/platform-coupons.service';
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

const AUDIT_CATEGORY = 'Organization Management';
// See platform-organizations.service.ts for why Grace_Period/Paused/Pending_Payment
// are included here alongside the obviously-active statuses.
const ACTIVE_SUB_STATUSES = ['Active', 'Trialing', 'Past_Due', 'Grace_Period', 'Paused', 'Pending_Payment'];
const DAY = 24 * 60 * 60 * 1000;

const MONTHLY_MULTIPLIER: Record<string, number> = {
  FREE: 0,
  MONTHLY: 1,
  QUARTERLY: 1 / 3,
  HALF_YEARLY: 1 / 6,
  YEARLY: 1 / 12,
  ENTERPRISE: 1,
  CUSTOM: 1,
};

@Injectable()
export class PlatformOrgDetailService {
  constructor(
    private prisma: DatabaseService,
    private auditLogsService: AuditLogsService,
    private orgsService: PlatformOrganizationsService,
    private couponsService: PlatformCouponsService,
  ) {}

  // ---------------------------------------------------------------------------
  // OVERVIEW (header + hero + overview + insights + alerts)
  // ---------------------------------------------------------------------------

  async getOverview(id: string, actorUserId: string) {
    const enriched = await this.orgsService.getEnriched(id);
    const org = await this.prisma.organization.findFirst({
      where: { id, deletedAt: null },
      include: {
        subscriptions: { where: { status: { in: ACTIVE_SUB_STATUSES } }, include: { plan: true }, orderBy: { startDate: 'desc' }, take: 1 },
        users: { where: { isActive: true }, include: { user: true, role: true } },
      },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const activeSub = org.subscriptions[0] ?? null;
    const plan = activeSub?.plan ?? null;
    const monthlyRevenue = plan ? Math.round(plan.price * (MONTHLY_MULTIPLIER[plan.billingCycle] ?? 1) * 100) / 100 : 0;

    const owner = org.users.find((u) => u.role?.name === 'Organization Owner') ?? org.users[0] ?? null;

    const recentActivity = await this.buildTimeline(id, 6);
    const alerts = this.buildAlerts(enriched, activeSub);
    const recommendations = this.buildRecommendations(enriched);

    await this.logEvent(actorUserId, 'Organization 360 Viewed', `Opened the Organization 360 workspace for "${org.name}".`, id);

    return {
      // header
      id: org.id,
      name: org.name,
      slug: org.slug,
      logoUrl: org.logoUrl,
      status: enriched.derivedStatus,
      platformStatus: org.platformStatus,
      workspaceExperience: enriched.workspaceExperience,
      createdAt: org.createdAt,
      region: [org.city, org.state, org.country].filter(Boolean).join(', ') || org.country || '—',
      country: org.country,
      timezone: org.timezone,
      language: org.language,
      currency: org.currency,
      suspendReason: org.suspendReason,
      owner: owner ? { id: owner.user.id, name: owner.user.fullName, email: owner.user.email, phone: owner.user.phoneNumber } : null,
      businessType: org.businessType,
      website: org.website,
      email: org.email,
      phone: org.phone,
      addressLine1: org.addressLine1,
      addressLine2: org.addressLine2,
      city: org.city,
      state: org.state,
      postalCode: org.postalCode,
      // subscription snapshot
      plan: plan ? { id: plan.id, name: plan.name, billingCycle: plan.billingCycle, price: plan.price, currency: plan.currency } : null,
      subscriptionStatus: enriched.subscriptionStatus,
      trialEndDate: activeSub?.trialEndDate ?? null,
      renewalDate: activeSub?.endDate ?? null,
      paymentStatus: enriched.paymentStatus,
      // hero KPIs
      kpis: {
        branches: enriched.usage.branches,
        members: enriched.usage.members,
        users: enriched.usage.users,
        storage: enriched.usage.storage,
        monthlyRevenue,
        health: enriched.health,
        lastActivity: org.lastActiveAt,
      },
      health: enriched.health,
      recentActivity,
      alerts,
      recommendations,
    };
  }

  // ---------------------------------------------------------------------------
  // SUBSCRIPTION
  // ---------------------------------------------------------------------------

  async getSubscription(id: string) {
    const org = await this.assertOrg(id);
    const subscription = await this.prisma.organizationSubscription.findFirst({
      where: { organizationId: id, status: { in: ACTIVE_SUB_STATUSES } },
      include: {
        plan: { include: { resourceLimits: { include: { resource: true } }, featureAccess: true } },
        invoices: { include: { payments: true }, orderBy: { createdAt: 'desc' } },
        couponRedemptions: { include: { coupon: true }, orderBy: { redeemedAt: 'desc' } },
      },
      orderBy: { startDate: 'desc' },
    });

    const plan = subscription?.plan ?? null;
    const effectivePrice = subscription?.isEnterpriseCustom && subscription.customPrice != null ? subscription.customPrice : plan?.price ?? 0;
    const monthlyRevenue = plan ? Math.round(effectivePrice * (MONTHLY_MULTIPLIER[plan.billingCycle] ?? 1) * 100) / 100 : 0;

    const now = new Date();
    const isTrial = !!subscription?.trialEndDate && new Date(subscription.trialEndDate) >= now && subscription.status === 'Trialing';
    const trialDaysLeft = subscription?.trialEndDate ? Math.max(0, Math.ceil((new Date(subscription.trialEndDate).getTime() - now.getTime()) / DAY)) : null;
    const graceDaysLeft = subscription?.graceUntil ? Math.max(0, Math.ceil((new Date(subscription.graceUntil).getTime() - now.getTime()) / DAY)) : null;

    const [timeline, notifications] = await Promise.all([
      this.buildSubscriptionTimeline(id),
      this.buildSubscriptionNotifications(org.name, subscription),
    ]);

    return {
      hasSubscription: !!subscription,
      subscriptionId: subscription?.id ?? null,
      plan: plan ? { id: plan.id, name: plan.name, description: plan.description, price: plan.price, currency: plan.currency, billingCycle: plan.billingCycle, workspaceExperienceDefault: plan.workspaceExperienceDefault } : null,
      status: subscription?.status ?? 'None',
      isTrial,
      trialEndDate: subscription?.trialEndDate ?? null,
      trialDaysLeft: isTrial ? trialDaysLeft : null,
      startDate: subscription?.startDate ?? null,
      renewalDate: subscription?.endDate ?? null,
      billingCycle: plan?.billingCycle ?? null,
      effectivePrice,
      monthlyRevenue,
      paymentStatus: this.paymentStatusOf(subscription),
      autoRenew: subscription?.autoRenew ?? true,
      paymentMethod: subscription?.paymentMethod ?? null,
      pausedAt: subscription?.pausedAt ?? null,
      cancelledAt: subscription?.cancelledAt ?? null,
      cancelReason: subscription?.cancelReason ?? null,
      graceUntil: subscription?.graceUntil ?? null,
      graceDaysLeft,
      isEnterpriseCustom: subscription?.isEnterpriseCustom ?? false,
      customPrice: subscription?.customPrice ?? null,
      privateNotes: subscription?.privateNotes ?? null,
      dedicatedSupportContact: subscription?.dedicatedSupportContact ?? null,
      customSlaTerms: subscription?.customSlaTerms ?? null,
      invoices: (subscription?.invoices ?? []).map((inv) => ({
        id: inv.id,
        amount: inv.amount,
        status: inv.status,
        description: inv.description,
        dueDate: inv.dueDate,
        paidAt: inv.paidAt,
        createdAt: inv.createdAt,
        payments: inv.payments.map((p) => ({
          id: p.id,
          amount: p.amount,
          status: p.status,
          method: p.paymentMethod,
          refundedAmount: p.refundedAmount,
          refundedAt: p.refundedAt,
          refundReason: p.refundReason,
          createdAt: p.createdAt,
        })),
      })),
      coupons: (subscription?.couponRedemptions ?? []).map((r) => ({
        id: r.id,
        code: r.coupon.code,
        description: r.coupon.description,
        discountType: r.coupon.discountType,
        discountValue: r.coupon.discountValue,
        discountApplied: r.discountApplied,
        stackable: r.coupon.stackable,
        redeemedAt: r.redeemedAt,
        removedAt: r.removedAt,
        active: !r.removedAt,
      })),
      timeline,
      notifications,
    };
  }

  // ---------------------------------------------------------------------------
  // USAGE TREND (real member-growth series)
  // ---------------------------------------------------------------------------

  async getUsageTrend(id: string) {
    await this.assertOrg(id);
    const members = await this.prisma.member.findMany({ where: { organizationId: id, deletedAt: null }, select: { createdAt: true } });
    const gyms = await this.prisma.gym.findMany({ where: { organizationId: id, deletedAt: null }, select: { createdAt: true } });

    const months: { label: string; key: string; members: number; branches: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ label: d.toLocaleString('en-US', { month: 'short' }), key, members: 0, branches: 0 });
    }
    const cumulativeAt = (records: { createdAt: Date }[], endOfMonth: Date) => records.filter((r) => new Date(r.createdAt) <= endOfMonth).length;

    for (const m of months) {
      const [y, mo] = m.key.split('-').map(Number);
      const endOfMonth = new Date(y, mo, 0, 23, 59, 59);
      m.members = cumulativeAt(members, endOfMonth);
      m.branches = cumulativeAt(gyms, endOfMonth);
    }

    const first = months[0].members;
    const last = months[months.length - 1].members;
    const growthRate = first > 0 ? Math.round(((last - first) / first) * 100) : last > 0 ? 100 : 0;

    return { series: months, growthRate };
  }

  // ---------------------------------------------------------------------------
  // BRANCHES
  // ---------------------------------------------------------------------------

  async getBranches(id: string) {
    await this.assertOrg(id);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const gyms = await this.prisma.gym.findMany({
      where: { organizationId: id, deletedAt: null },
      include: {
        _count: { select: { members: true, employeeGymAssignments: true } },
        employeeGymAssignments: { where: { isBranchManager: true }, include: { employee: { include: { user: true } } }, take: 1 },
      },
      orderBy: { createdAt: 'asc' },
    });

    return Promise.all(
      gyms.map(async (gym) => {
        const attendanceThisMonth = await this.prisma.attendance.count({ where: { gymId: gym.id, checkInTime: { gte: monthStart } } });
        const manager = gym.employeeGymAssignments[0]?.employee?.user?.fullName ?? null;
        return {
          id: gym.id,
          name: gym.name,
          code: gym.code,
          status: gym.deletedAt ? 'Inactive' : 'Active',
          capacity: gym.capacity,
          members: gym._count.members,
          employees: gym._count.employeeGymAssignments,
          attendanceThisMonth,
          manager,
          city: gym.address ?? null,
          createdAt: gym.createdAt,
        };
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // ORGANIZATION USERS
  // ---------------------------------------------------------------------------

  async getUsers(id: string) {
    await this.assertOrg(id);
    const users = await this.prisma.organizationUser.findMany({
      where: { organizationId: id },
      include: { user: true, role: true },
    });

    // Last-login is derived from the audit trail where available.
    const logins = await this.prisma.auditLog.findMany({
      where: { organizationId: id, eventType: 'LOGIN_SUCCESS' },
      orderBy: { createdAt: 'desc' },
    });
    const lastLoginByUser = new Map<string, Date>();
    for (const log of logins) {
      if (log.userId && !lastLoginByUser.has(log.userId)) lastLoginByUser.set(log.userId, log.createdAt);
    }

    return users
      .map((u) => ({
        id: u.user.id,
        membershipId: u.id,
        name: u.user.fullName,
        email: u.user.email,
        phone: u.user.phoneNumber,
        role: u.role?.name ?? '—',
        isOwner: u.role?.name === 'Organization Owner',
        isActive: u.isActive,
        lastLogin: lastLoginByUser.get(u.user.id) ?? null,
        createdAt: u.user.createdAt,
      }))
      .sort((a, b) => (a.isOwner === b.isOwner ? a.name.localeCompare(b.name) : a.isOwner ? -1 : 1));
  }

  // ---------------------------------------------------------------------------
  // BILLING
  // ---------------------------------------------------------------------------

  async getBilling(id: string) {
    await this.assertOrg(id);
    const subs = await this.prisma.organizationSubscription.findMany({
      where: { organizationId: id },
      include: { invoices: { include: { payments: true }, orderBy: { createdAt: 'desc' } }, plan: { select: { name: true } } },
    });

    const invoices = subs.flatMap((s) => s.invoices.map((inv) => ({ ...inv, planName: s.plan.name })));
    const payments = invoices.flatMap((inv) =>
      inv.payments.map((p) => ({ id: p.id, invoiceId: inv.id, amount: p.amount, status: p.status, method: p.paymentMethod, createdAt: p.createdAt })),
    );

    const totalPaid = payments.filter((p) => p.status === 'Success').reduce((sum, p) => sum + p.amount, 0);
    const outstanding = invoices.filter((inv) => inv.status === 'Unpaid').reduce((sum, inv) => sum + inv.amount, 0);
    const failedCount = payments.filter((p) => p.status === 'Failed').length;

    return {
      summary: {
        totalPaid: Math.round(totalPaid * 100) / 100,
        outstanding: Math.round(outstanding * 100) / 100,
        invoiceCount: invoices.length,
        failedPayments: failedCount,
        refunds: 0, // no refund records modelled yet
        autoRenew: true,
        taxRegion: (await this.prisma.organization.findUnique({ where: { id }, select: { country: true } }))?.country ?? '—',
      },
      invoices: invoices
        .map((inv) => ({
          id: inv.id,
          planName: inv.planName,
          amount: inv.amount,
          status: inv.status,
          dueDate: inv.dueDate,
          paidAt: inv.paidAt,
          createdAt: inv.createdAt,
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      payments: payments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    };
  }

  // ---------------------------------------------------------------------------
  // ACTIVITY TIMELINE
  // ---------------------------------------------------------------------------

  async getActivity(id: string) {
    await this.assertOrg(id);
    return this.buildTimeline(id, 60);
  }

  // ---------------------------------------------------------------------------
  // AUDIT LOGS (searchable + paginated)
  // ---------------------------------------------------------------------------

  async getAudit(id: string, query: { search?: string; category?: string; page?: number; limit?: number }) {
    await this.assertOrg(id);
    const where: any = { organizationId: id };
    if (query.category) where.eventCategory = query.category;
    if (query.search) {
      where.OR = [
        { action: { contains: query.search, mode: 'insensitive' } },
        { details: { contains: query.search, mode: 'insensitive' } },
        { user: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));

    const [total, data] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    ]);

    const categories = await this.prisma.auditLog.findMany({ where: { organizationId: id }, select: { eventCategory: true }, distinct: ['eventCategory'] });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      categories: categories.map((c) => c.eventCategory).filter(Boolean),
    };
  }

  // ---------------------------------------------------------------------------
  // SUPPORT
  // ---------------------------------------------------------------------------

  async getSupport(id: string) {
    await this.assertOrg(id);
    const tickets = await this.prisma.supportTicket.findMany({ where: { organizationId: id }, orderBy: { createdAt: 'desc' } });
    const resolved = tickets.filter((t) => t.satisfactionScore != null);
    const avgCsat = resolved.length ? Math.round((resolved.reduce((s, t) => s + (t.satisfactionScore || 0), 0) / resolved.length) * 10) / 10 : null;
    return {
      tickets,
      summary: {
        open: tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length,
        closed: tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length,
        urgent: tickets.filter((t) => t.priority === 'URGENT' && (t.status === 'OPEN' || t.status === 'IN_PROGRESS')).length,
        avgCsat,
      },
    };
  }

  async createSupportTicket(id: string, dto: CreateSupportTicketDto, actorUserId: string) {
    const org = await this.assertOrg(id);
    const actorName = await this.getActorName(actorUserId);
    const ticket = await this.prisma.supportTicket.create({
      data: {
        organizationId: id,
        subject: dto.subject,
        description: dto.description,
        priority: (dto.priority as any) || 'MEDIUM',
        category: dto.category,
        assignedEngineer: dto.assignedEngineer,
        internalNotes: dto.internalNotes,
        createdByName: actorName,
      },
    });
    await this.logEvent(actorUserId, 'Support Ticket Created', `Opened support ticket "${dto.subject}" for "${org.name}".`, id, 'SupportTicket', ticket.id);
    return ticket;
  }

  // ---------------------------------------------------------------------------
  // SETTINGS
  // ---------------------------------------------------------------------------

  async getSettings(id: string) {
    const org = await this.prisma.organization.findFirst({
      where: { id, deletedAt: null },
      include: {
        subscriptions: { where: { status: { in: ACTIVE_SUB_STATUSES } }, include: { plan: { select: { workspaceExperienceDefault: true, name: true } } }, orderBy: { startDate: 'desc' }, take: 1 },
        engineOverrides: { where: { status: 'ACTIVE' }, include: { feature: true, resource: true } },
      },
    });
    if (!org) throw new NotFoundException('Organization not found');
    const sub = org.subscriptions[0] ?? null;
    return {
      language: org.language,
      timezone: org.timezone,
      dateFormat: org.dateFormat,
      currency: org.currency,
      settings: org.settings ?? {},
      workspaceExperienceDefault: sub?.plan?.workspaceExperienceDefault ?? 'ESSENTIAL',
      workspaceExperienceOverride: sub?.workspaceExperienceOverride ?? null,
      effectiveWorkspaceExperience: sub?.workspaceExperienceOverride ?? sub?.plan?.workspaceExperienceDefault ?? 'ESSENTIAL',
      platformOverrides: org.engineOverrides.map((o) => ({
        id: o.id,
        scope: o.scope,
        target: o.feature?.label ?? o.resource?.label ?? '—',
        overrideType: o.overrideType,
        reason: o.reason,
        expiresAt: o.expiresAt,
      })),
    };
  }

  async updateSettings(id: string, dto: UpdateOrgSettingsDto, actorUserId: string) {
    const org = await this.assertOrg(id);
    const data: any = {};
    if (dto.language !== undefined) data.language = dto.language;
    if (dto.timezone !== undefined) data.timezone = dto.timezone;
    if (dto.dateFormat !== undefined) data.dateFormat = dto.dateFormat;
    if (Object.keys(data).length) await this.prisma.organization.update({ where: { id }, data });

    if (dto.workspaceExperienceOverride !== undefined) {
      const sub = await this.prisma.organizationSubscription.findFirst({ where: { organizationId: id, status: { in: ACTIVE_SUB_STATUSES } }, orderBy: { startDate: 'desc' } });
      if (sub) await this.prisma.organizationSubscription.update({ where: { id: sub.id }, data: { workspaceExperienceOverride: (dto.workspaceExperienceOverride as any) || null } });
    }

    await this.logEvent(actorUserId, 'Organization Settings Updated', `Updated platform settings for "${org.name}".`, id);
    return this.getSettings(id);
  }

  // ---------------------------------------------------------------------------
  // MUTATIONS: assign plan / reset limits / notify
  // ---------------------------------------------------------------------------

  async assignPlan(id: string, dto: AssignPlanDto, actorUserId: string) {
    const org = await this.assertOrg(id);
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: dto.planId } });
    if (!plan) throw new NotFoundException('Plan not found');

    const now = new Date();
    const existing = await this.prisma.organizationSubscription.findFirst({ where: { organizationId: id, status: { in: ACTIVE_SUB_STATUSES } }, include: { plan: true }, orderBy: { startDate: 'desc' } });

    // Auto-detect the nature of the change purely from price so the caller
    // doesn't need separate upgrade/downgrade endpoints - the wizard framing
    // on the frontend differs, but the mutation and audit trail are unified.
    let changeType: 'PLAN_ASSIGNED' | 'UPGRADED' | 'DOWNGRADED' = 'PLAN_ASSIGNED';
    if (existing) {
      if (plan.price > existing.plan.price) changeType = 'UPGRADED';
      else if (plan.price < existing.plan.price) changeType = 'DOWNGRADED';
    }

    let subscriptionId: string;
    if (existing) {
      const wasUnhealthy = ['Paused', 'Grace_Period', 'Pending_Payment', 'Suspended'].includes(existing.status);
      await this.prisma.organizationSubscription.update({
        where: { id: existing.id },
        data: { planId: plan.id, status: wasUnhealthy ? 'Active' : existing.status, pausedAt: wasUnhealthy ? null : undefined, graceUntil: wasUnhealthy ? null : undefined },
      });
      subscriptionId = existing.id;
    } else {
      const created = await this.prisma.organizationSubscription.create({
        data: { organizationId: id, planId: plan.id, status: 'Active', startDate: now, endDate: this.addBillingCycle(now, plan.billingCycle) },
      });
      subscriptionId = created.id;
    }

    if (dto.couponCode) {
      await this.applyCoupon(id, { code: dto.couponCode }, actorUserId, subscriptionId);
    }

    const actionLabel = changeType === 'UPGRADED' ? 'Subscription Upgraded' : changeType === 'DOWNGRADED' ? 'Subscription Downgraded' : 'Subscription Assigned';
    await this.logEvent(actorUserId, actionLabel, `${actionLabel.replace('Subscription ', '')} "${org.name}" to "${plan.name}".`, id, 'OrganizationSubscription', subscriptionId, changeType);
    return { ok: true, planName: plan.name, changeType };
  }

  async resetLimits(id: string, actorUserId: string) {
    const org = await this.assertOrg(id);
    const actorName = await this.getActorName(actorUserId);
    const result = await this.prisma.engineOverride.updateMany({
      where: { organizationId: id, status: 'ACTIVE' },
      data: { status: 'REVOKED', revokedAt: new Date(), revokedByName: actorName },
    });
    await this.logEvent(actorUserId, 'Organization Limits Reset', `Reset limits for "${org.name}" — revoked ${result.count} active override(s), reverting to plan defaults.`, id);
    return { ok: true, revoked: result.count };
  }

  async notify(id: string, dto: NotifyOrganizationDto, actorUserId: string) {
    const org = await this.assertOrg(id);
    // No delivery channel is wired yet; the intent is captured in the audit log.
    await this.logEvent(actorUserId, 'Organization Notified', `Sent notification to "${org.name}": ${dto.title}`, id);
    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  // SUBSCRIPTION LIFECYCLE (PLT-006)
  // ---------------------------------------------------------------------------

  async extendTrial(id: string, dto: ExtendTrialDto, actorUserId: string) {
    const org = await this.assertOrg(id);
    const sub = await this.getCurrentSub(id);
    const base = sub.trialEndDate && new Date(sub.trialEndDate) > new Date() ? new Date(sub.trialEndDate) : new Date();
    const newTrialEnd = new Date(base.getTime() + dto.days * DAY);

    await this.prisma.organizationSubscription.update({
      where: { id: sub.id },
      data: { status: 'Trialing', trialEndDate: newTrialEnd, trialStartDate: sub.trialStartDate ?? new Date() },
    });
    await this.logEvent(actorUserId, 'Trial Extended', `Extended trial for "${org.name}" by ${dto.days} day(s), now ending ${newTrialEnd.toDateString()}.`, id, 'OrganizationSubscription', sub.id, 'TRIAL_EXTENDED');
    return { ok: true, trialEndDate: newTrialEnd };
  }

  async endTrial(id: string, actorUserId: string) {
    const org = await this.assertOrg(id);
    const sub = await this.getCurrentSub(id);
    await this.prisma.organizationSubscription.update({ where: { id: sub.id }, data: { status: 'Active', trialEndDate: new Date() } });
    await this.logEvent(actorUserId, 'Trial Converted To Paid', `Converted "${org.name}" from trial to a paid subscription.`, id, 'OrganizationSubscription', sub.id, 'TRIAL_CONVERTED');
    return { ok: true };
  }

  async pauseSubscription(id: string, actorUserId: string) {
    const org = await this.assertOrg(id);
    const sub = await this.getCurrentSub(id);
    if (sub.status === 'Paused') throw new BadRequestException('Subscription is already paused.');
    await this.prisma.organizationSubscription.update({ where: { id: sub.id }, data: { status: 'Paused', pausedAt: new Date(), autoRenew: false } });
    await this.logEvent(actorUserId, 'Subscription Paused', `Paused the subscription for "${org.name}".`, id, 'OrganizationSubscription', sub.id, 'SUBSCRIPTION_PAUSED');
    return { ok: true };
  }

  async resumeSubscription(id: string, actorUserId: string) {
    const org = await this.assertOrg(id);
    const sub = await this.getCurrentSub(id);
    if (sub.status !== 'Paused') throw new BadRequestException('Subscription is not paused.');
    await this.prisma.organizationSubscription.update({ where: { id: sub.id }, data: { status: 'Active', pausedAt: null, autoRenew: true } });
    await this.logEvent(actorUserId, 'Subscription Resumed', `Resumed the subscription for "${org.name}".`, id, 'OrganizationSubscription', sub.id, 'SUBSCRIPTION_RESUMED');
    return { ok: true };
  }

  async cancelSubscription(id: string, dto: CancelSubscriptionDto, actorUserId: string) {
    const org = await this.assertOrg(id);
    const sub = await this.getCurrentSub(id);
    if (sub.status === 'Canceled') throw new BadRequestException('Subscription is already cancelled.');
    await this.prisma.organizationSubscription.update({
      where: { id: sub.id },
      data: { status: 'Canceled', cancelledAt: new Date(), cancelReason: dto.reason || null, autoRenew: false },
    });
    await this.logEvent(actorUserId, 'Subscription Cancelled', `Cancelled the subscription for "${org.name}"${dto.reason ? `: ${dto.reason}` : '.'}`, id, 'OrganizationSubscription', sub.id, 'SUBSCRIPTION_CANCELLED');
    return { ok: true };
  }

  async applyCoupon(id: string, dto: ApplyCouponDto, actorUserId: string, subscriptionIdOverride?: string) {
    const org = await this.assertOrg(id);
    const sub = subscriptionIdOverride
      ? await this.prisma.organizationSubscription.findUnique({ where: { id: subscriptionIdOverride }, include: { plan: true } })
      : await this.getCurrentSub(id);
    if (!sub) throw new NotFoundException('Subscription not found');

    const coupon = await this.couponsService.validateForSubscription(dto.code, sub.planId, id);
    const plan = sub.plan ?? (await this.prisma.subscriptionPlan.findUniqueOrThrow({ where: { id: sub.planId } }));
    const discountApplied = coupon.discountType === 'PERCENTAGE' ? Math.round(plan.price * (coupon.discountValue / 100) * 100) / 100 : coupon.discountValue;

    await this.prisma.$transaction([
      this.prisma.couponRedemption.create({ data: { couponId: coupon.id, organizationId: id, subscriptionId: sub.id, discountApplied } }),
      this.prisma.coupon.update({ where: { id: coupon.id }, data: { redemptionCount: { increment: 1 } } }),
    ]);

    await this.logEvent(actorUserId, 'Coupon Applied', `Applied coupon "${coupon.code}" to "${org.name}" (${discountApplied} ${coupon.currency || plan.currency} off).`, id, 'CouponRedemption', sub.id, 'COUPON_APPLIED');
    return { ok: true, discountApplied };
  }

  async removeCoupon(id: string, redemptionId: string, actorUserId: string) {
    const org = await this.assertOrg(id);
    const redemption = await this.prisma.couponRedemption.findFirst({ where: { id: redemptionId, organizationId: id }, include: { coupon: true } });
    if (!redemption) throw new NotFoundException('Coupon redemption not found');
    if (redemption.removedAt) throw new BadRequestException('This coupon has already been removed.');

    await this.prisma.couponRedemption.update({ where: { id: redemptionId }, data: { removedAt: new Date() } });
    await this.logEvent(actorUserId, 'Coupon Removed', `Removed coupon "${redemption.coupon.code}" from "${org.name}".`, id, 'CouponRedemption', redemptionId, 'COUPON_REMOVED');
    return { ok: true };
  }

  async generateInvoice(id: string, dto: GenerateInvoiceDto, actorUserId: string) {
    const org = await this.assertOrg(id);
    const sub = await this.getCurrentSub(id);
    const invoice = await this.prisma.subscriptionInvoice.create({
      data: {
        subscriptionId: sub.id,
        amount: dto.amount,
        status: 'Unpaid',
        description: dto.description || 'Manually generated invoice',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : new Date(Date.now() + 14 * DAY),
      },
    });
    await this.logEvent(actorUserId, 'Invoice Generated', `Generated a manual invoice for "${org.name}" (${sub.plan?.currency || 'USD'} ${dto.amount}).`, id, 'SubscriptionInvoice', invoice.id, 'INVOICE_GENERATED');
    return invoice;
  }

  async refundPayment(id: string, paymentId: string, dto: RefundPaymentDto, actorUserId: string) {
    const org = await this.assertOrg(id);
    const payment = await this.prisma.subscriptionPayment.findUnique({ where: { id: paymentId }, include: { invoice: true } });
    if (!payment) throw new NotFoundException('Payment not found');
    const sub = await this.prisma.organizationSubscription.findUnique({ where: { id: payment.invoice.subscriptionId } });
    if (sub?.organizationId !== id) throw new BadRequestException('Payment does not belong to this organization.');
    if (dto.amount > payment.amount) throw new BadRequestException('Refund amount cannot exceed the original payment amount.');

    const totalRefunded = (payment.refundedAmount || 0) + dto.amount;
    await this.prisma.subscriptionPayment.update({
      where: { id: paymentId },
      data: {
        status: totalRefunded >= payment.amount ? 'Refunded' : 'Partially_Refunded',
        refundedAmount: totalRefunded,
        refundedAt: new Date(),
        refundReason: dto.reason || payment.refundReason,
      },
    });
    await this.logEvent(actorUserId, 'Payment Refunded', `Refunded ${dto.amount} on a payment for "${org.name}"${dto.reason ? `: ${dto.reason}` : '.'}`, id, 'SubscriptionPayment', paymentId, 'PAYMENT_REFUNDED');
    return { ok: true };
  }

  async updateEnterpriseSettings(id: string, dto: UpdateEnterpriseSettingsDto, actorUserId: string) {
    const org = await this.assertOrg(id);
    const sub = await this.getCurrentSub(id);
    await this.prisma.organizationSubscription.update({
      where: { id: sub.id },
      data: {
        isEnterpriseCustom: dto.isEnterpriseCustom,
        customPrice: dto.customPrice,
        privateNotes: dto.privateNotes,
        dedicatedSupportContact: dto.dedicatedSupportContact,
        customSlaTerms: dto.customSlaTerms,
      },
    });
    await this.logEvent(actorUserId, 'Enterprise Settings Updated', `Updated enterprise commercial terms for "${org.name}".`, id, 'OrganizationSubscription', sub.id, 'ENTERPRISE_SETTINGS_UPDATED');
    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private async buildTimeline(id: string, limit: number) {
    // The timeline blends real audit events with derived lifecycle milestones
    // (org created, subscription assigned, users/branches added) so it reads
    // chronologically even before much audit history exists.
    const [org, auditLogs, sub, recentUsers, recentGyms] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id }, select: { name: true, createdAt: true } }),
      this.prisma.auditLog.findMany({ where: { organizationId: id }, orderBy: { createdAt: 'desc' }, take: 40 }),
      this.prisma.organizationSubscription.findFirst({ where: { organizationId: id }, include: { plan: { select: { name: true } } }, orderBy: { startDate: 'asc' } }),
      this.prisma.organizationUser.findMany({ where: { organizationId: id }, include: { user: { select: { fullName: true, createdAt: true } } }, orderBy: { user: { createdAt: 'desc' } }, take: 5 }),
      this.prisma.gym.findMany({ where: { organizationId: id }, orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);

    type Event = { id: string; type: string; icon: string; title: string; detail?: string; user?: string; at: Date };
    const events: Event[] = [];

    if (org) events.push({ id: `created-${id}`, type: 'created', icon: 'sparkles', title: 'Organization created', detail: org.name, at: org.createdAt });
    if (sub) events.push({ id: `sub-${sub.id}`, type: 'subscription', icon: 'credit-card', title: 'Subscription assigned', detail: sub.plan.name, at: sub.startDate });

    for (const u of recentUsers) events.push({ id: `user-${u.id}`, type: 'user', icon: 'user-plus', title: 'User added', detail: u.user.fullName, at: u.user.createdAt });
    for (const g of recentGyms) events.push({ id: `gym-${g.id}`, type: 'branch', icon: 'building', title: 'Branch created', detail: g.name, at: g.createdAt });

    for (const log of auditLogs) {
      events.push({ id: log.id, type: 'audit', icon: 'activity', title: log.action, detail: log.details, user: log.user, at: log.createdAt });
    }

    return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit);
  }

  private buildAlerts(enriched: any, activeSub: any): { level: 'critical' | 'warning' | 'info'; title: string; detail: string }[] {
    const alerts: { level: 'critical' | 'warning' | 'info'; title: string; detail: string }[] = [];
    const now = Date.now();

    if (enriched.derivedStatus === 'SUSPENDED') alerts.push({ level: 'critical', title: 'Organization suspended', detail: enriched.suspendReason || 'Access is currently disabled.' });
    if (enriched.paymentStatus === 'FAILED') alerts.push({ level: 'critical', title: 'Payment failed', detail: 'The most recent invoice is unpaid or a payment was declined.' });

    const m = enriched.usage.members;
    if (m.limit && m.limit > 0) {
      const ratio = m.used / m.limit;
      if (ratio >= 1) alerts.push({ level: 'critical', title: 'Member limit reached', detail: `${m.used} of ${m.limit} members used.` });
      else if (ratio >= 0.8) alerts.push({ level: 'warning', title: 'Member limit almost reached', detail: `${m.used} of ${m.limit} members used (${Math.round(ratio * 100)}%).` });
    }

    if (activeSub?.trialEndDate) {
      const daysLeft = Math.ceil((new Date(activeSub.trialEndDate).getTime() - now) / DAY);
      if (daysLeft >= 0 && daysLeft <= 7) alerts.push({ level: 'warning', title: 'Trial expiring soon', detail: `Trial ends in ${daysLeft} day(s).` });
    }
    if (activeSub?.endDate) {
      const daysLeft = Math.ceil((new Date(activeSub.endDate).getTime() - now) / DAY);
      if (daysLeft >= 0 && daysLeft <= 7) alerts.push({ level: 'warning', title: 'Subscription renewing soon', detail: `Renews in ${daysLeft} day(s).` });
    }

    if (enriched.lastActiveAt) {
      const idleDays = Math.floor((now - new Date(enriched.lastActiveAt).getTime()) / DAY);
      if (idleDays > 14) alerts.push({ level: 'info', title: 'Low recent activity', detail: `No recorded activity in ${idleDays} days.` });
    }

    return alerts;
  }

  private buildRecommendations(enriched: any): { title: string; detail: string; action?: string }[] {
    const recs: { title: string; detail: string; action?: string }[] = [];
    const m = enriched.usage.members;
    if (m.limit && m.limit > 0 && m.used / m.limit >= 0.8) {
      recs.push({ title: 'Member limit almost reached', detail: `Using ${m.used} of ${m.limit} members. Recommend upgrading to a higher plan.`, action: 'upgrade' });
    }
    const s = enriched.usage.storage;
    if (s.limit && s.limit > 0 && s.used / s.limit >= 0.8) {
      recs.push({ title: 'Storage usage high', detail: `Storage usage exceeds 80%. Recommend upgrade.`, action: 'upgrade' });
    }
    if (enriched.derivedStatus === 'TRIAL') {
      recs.push({ title: 'Convert trial to paid', detail: 'This organization is on a trial. Reach out to convert before it expires.', action: 'assign_plan' });
    }
    if (enriched.paymentStatus === 'FAILED') {
      recs.push({ title: 'Resolve failed payment', detail: 'A payment has failed. Follow up with the customer or retry billing.', action: 'billing' });
    }
    if (recs.length === 0) recs.push({ title: 'Healthy account', detail: 'No action needed — all signals look good.' });
    return recs;
  }

  private paymentStatusOf(sub: any): 'PAID' | 'FAILED' | 'NONE' {
    if (!sub?.invoices?.length) return 'NONE';
    const hasFailed = sub.invoices.some((inv: any) => inv.status === 'Unpaid' || (inv.payments || []).some((p: any) => p.status === 'Failed'));
    if (hasFailed) return 'FAILED';
    return sub.invoices.some((inv: any) => inv.status === 'Paid') ? 'PAID' : 'NONE';
  }

  private async getCurrentSub(organizationId: string) {
    const sub = await this.prisma.organizationSubscription.findFirst({
      where: { organizationId, status: { in: ACTIVE_SUB_STATUSES } },
      include: { plan: true },
      orderBy: { startDate: 'desc' },
    });
    if (!sub) throw new NotFoundException('This organization has no subscription to manage.');
    return sub;
  }

  // Subscription-specific timeline: Trial Started, Plan Assigned, Upgrade,
  // Downgrade, Coupon Applied, Invoice Paid, Renewed, Cancelled - narrower
  // than the general Org 360 Activity tab, scoped to commercial events only.
  private async buildSubscriptionTimeline(organizationId: string) {
    const [sub, auditLogs, paidInvoices] = await Promise.all([
      this.prisma.organizationSubscription.findFirst({ where: { organizationId }, include: { plan: { select: { name: true } } }, orderBy: { startDate: 'asc' } }),
      this.prisma.auditLog.findMany({
        where: {
          organizationId,
          eventType: {
            in: [
              'PLAN_ASSIGNED',
              'SUBSCRIPTION_ASSIGNED',
              'UPGRADED',
              'DOWNGRADED',
              'COUPON_APPLIED',
              'COUPON_REMOVED',
              'TRIAL_EXTENDED',
              'TRIAL_CONVERTED',
              'SUBSCRIPTION_PAUSED',
              'SUBSCRIPTION_RESUMED',
              'SUBSCRIPTION_CANCELLED',
              'INVOICE_GENERATED',
              'PAYMENT_REFUNDED',
              'ENTERPRISE_SETTINGS_UPDATED',
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.subscriptionInvoice.findMany({ where: { subscription: { organizationId }, status: 'Paid' }, orderBy: { paidAt: 'desc' }, take: 10 }),
    ]);

    type Event = { id: string; type: string; icon: string; title: string; detail?: string; user?: string; at: Date };
    const events: Event[] = [];

    if (sub?.trialStartDate) events.push({ id: `trial-${sub.id}`, type: 'trial', icon: 'clock', title: 'Trial started', detail: sub.plan.name, at: sub.trialStartDate });
    if (sub) events.push({ id: `sub-${sub.id}`, type: 'subscription', icon: 'credit-card', title: 'Plan assigned', detail: sub.plan.name, at: sub.startDate });
    for (const inv of paidInvoices) {
      if (inv.paidAt) events.push({ id: `invoice-${inv.id}`, type: 'invoice', icon: 'receipt', title: 'Invoice paid', detail: `${inv.amount}`, at: inv.paidAt });
    }
    for (const log of auditLogs) {
      events.push({ id: log.id, type: 'audit', icon: 'activity', title: log.action, detail: log.details, user: log.user, at: log.createdAt });
    }

    return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }

  // Derived, subscription-specific notifications (distinct from the general
  // Org 360 alerts): expiring, trial ending, payment failed, renewal
  // successful, upgrade completed, downgrade scheduled.
  private async buildSubscriptionNotifications(orgName: string, sub: any): Promise<{ level: 'critical' | 'warning' | 'info'; title: string; detail: string }[]> {
    if (!sub) return [];
    const notifications: { level: 'critical' | 'warning' | 'info'; title: string; detail: string }[] = [];
    const now = Date.now();

    if (sub.trialEndDate && sub.status === 'Trialing') {
      const daysLeft = Math.ceil((new Date(sub.trialEndDate).getTime() - now) / DAY);
      if (daysLeft <= 0) notifications.push({ level: 'critical', title: 'Trial ended', detail: 'Convert to a paid plan or the organization will lose access.' });
      else if (daysLeft <= 7) notifications.push({ level: 'warning', title: 'Trial ending soon', detail: `Trial ends in ${daysLeft} day(s).` });
    }
    if (sub.status === 'Grace_Period' && sub.graceUntil) {
      const daysLeft = Math.ceil((new Date(sub.graceUntil).getTime() - now) / DAY);
      notifications.push({ level: 'critical', title: 'Subscription in grace period', detail: `Will expire in ${Math.max(0, daysLeft)} day(s) unless payment is resolved.` });
    }
    if (sub.status === 'Pending_Payment') {
      notifications.push({ level: 'warning', title: 'Payment pending', detail: 'The initial payment for this subscription has not yet cleared.' });
    }
    if (sub.status === 'Paused') {
      notifications.push({ level: 'info', title: 'Subscription paused', detail: sub.pausedAt ? `Paused since ${new Date(sub.pausedAt).toDateString()}.` : 'Billing is currently paused.' });
    }
    if (sub.endDate && sub.autoRenew && ['Active', 'Trialing'].includes(sub.status)) {
      const daysLeft = Math.ceil((new Date(sub.endDate).getTime() - now) / DAY);
      if (daysLeft >= 0 && daysLeft <= 7) notifications.push({ level: 'info', title: 'Subscription renewing soon', detail: `Auto-renews in ${daysLeft} day(s).` });
    }
    if (!sub.autoRenew && sub.endDate && new Date(sub.endDate).getTime() > now) {
      notifications.push({ level: 'warning', title: 'Auto-renew is off', detail: `Subscription will expire on ${new Date(sub.endDate).toDateString()} unless renewed.` });
    }
    const hasFailedPayment = (sub.invoices || []).some((inv: any) => (inv.payments || []).some((p: any) => p.status === 'Failed'));
    if (hasFailedPayment) notifications.push({ level: 'critical', title: 'Payment failed', detail: 'A recent payment attempt failed.' });

    const recentPaid = (sub.invoices || []).find((inv: any) => inv.status === 'Paid' && inv.paidAt && now - new Date(inv.paidAt).getTime() < 3 * DAY);
    if (recentPaid) notifications.push({ level: 'info', title: 'Renewal successful', detail: `Payment of ${recentPaid.amount} received.` });

    return notifications;
  }

  private addBillingCycle(date: Date, billingCycle: string): Date {
    const result = new Date(date);
    switch (billingCycle) {
      case 'MONTHLY': result.setMonth(result.getMonth() + 1); break;
      case 'QUARTERLY': result.setMonth(result.getMonth() + 3); break;
      case 'HALF_YEARLY': result.setMonth(result.getMonth() + 6); break;
      case 'YEARLY': case 'ENTERPRISE': case 'CUSTOM': result.setFullYear(result.getFullYear() + 1); break;
      default: result.setFullYear(result.getFullYear() + 100); break;
    }
    return result;
  }

  private async assertOrg(id: string) {
    const org = await this.prisma.organization.findFirst({ where: { id, deletedAt: null } });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  private async getActorName(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user?.fullName || 'Platform Admin';
  }

  private async logEvent(actorUserId: string, action: string, details: string, organizationId: string, entityType = 'Organization', entityId?: string, eventType?: string) {
    const actorName = await this.getActorName(actorUserId);
    await this.auditLogsService.logEvent({
      organizationId,
      userId: actorUserId,
      action,
      user: actorName,
      details,
      eventType: eventType || action.toUpperCase().replace(/\s+/g, '_'),
      eventCategory: AUDIT_CATEGORY,
      entityType,
      entityId: entityId || organizationId,
    });
  }

  // --- REMINDER CHANNELS (PLT platform admin control) ---

  async getReminderChannels(orgId: string) {
    await this.requireOrg(orgId);
    const config = await this.prisma.orgReminderChannelConfig.findUnique({ where: { organizationId: orgId } });
    return config ?? {
      organizationId: orgId,
      smsEnabled: true,
      whatsAppEnabled: true,
      emailEnabled: true,
      smsSenderId: null,
      whatsAppSenderId: null,
      emailFromName: null,
      emailFromAddress: null,
      monthlyLimit: null,
      updatedAt: null,
      updatedByName: null,
    };
  }

  async updateReminderChannels(orgId: string, dto: UpdateReminderChannelsDto, actorUserId: string, actorName: string) {
    await this.requireOrg(orgId);
    const config = await this.prisma.orgReminderChannelConfig.upsert({
      where: { organizationId: orgId },
      create: { organizationId: orgId, updatedByName: actorName, ...dto },
      update: { updatedByName: actorName, ...dto },
    });
    await this.logEvent(actorUserId, 'Reminder Channels Updated',
      `Updated reminder channel config for org ${orgId}.`, orgId, 'OrgReminderChannelConfig', orgId, 'REMINDER_CHANNELS_UPDATED');
    return config;
  }

  async getReminderLogs(orgId: string, limit = 100) {
    await this.requireOrg(orgId);
    return this.prisma.expiryReminderLog.findMany({
      where: { organizationId: orgId },
      orderBy: { sentAt: 'desc' },
      take: limit,
      include: { rule: { select: { label: true } } },
    });
  }

  async getReminderRules(orgId: string) {
    await this.requireOrg(orgId);
    return this.prisma.expiryReminderRule.findMany({
      where: { organizationId: orgId },
      orderBy: { triggerDays: 'desc' },
    });
  }

  private async requireOrg(orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }
}
