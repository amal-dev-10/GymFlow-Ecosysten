import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PlatformOrgDetailService } from '../platform-organizations/platform-org-detail.service';
import { GenerateInvoiceDto } from '../platform-organizations/dto/generate-invoice.dto';
import { RefundPaymentDto } from '../platform-organizations/dto/refund-payment.dto';
import { ApplyCouponDto } from '../platform-organizations/dto/apply-coupon.dto';
import { ExtendTrialDto } from '../platform-organizations/dto/extend-trial.dto';
import { ListInvoicesDto } from './dto/list-invoices.dto';
import { ListPaymentsDto } from './dto/list-payments.dto';
import { PlatformGenerateInvoiceDto } from './dto/generate-invoice.dto';
import { PlatformRefundPaymentDto } from './dto/refund-payment.dto';
import { PlatformApplyCouponDto } from './dto/apply-coupon.dto';
import { PlatformExtendTrialDto } from './dto/extend-trial.dto';
import { RecordRevenueExportDto } from './dto/record-export.dto';

const AUDIT_CATEGORY = 'Billing';
const DAY_MS = 24 * 60 * 60 * 1000;
// Same normalization precedent as platform-plans.service.ts / platform-org-detail.service.ts
const MONTHLY_MULTIPLIER: Record<string, number> = {
  FREE: 0,
  MONTHLY: 1,
  QUARTERLY: 1 / 3,
  HALF_YEARLY: 1 / 6,
  YEARLY: 1 / 12,
  ENTERPRISE: 1,
  CUSTOM: 1,
};

// Payment status labels: the stored value stays "Success"/"Void" for backward
// compatibility with existing rows; the UI labels them "Successful"/"Cancelled"
// respectively - the same enum-label-mapping trick used for URGENT->"Critical"
// in PLT-011.
export const PAYMENT_STATUS_LABELS: Record<string, string> = { Success: 'Successful', Failed: 'Failed', Refunded: 'Refunded', Partially_Refunded: 'Partially Refunded' };
export const INVOICE_STATUS_LABELS: Record<string, string> = { Paid: 'Paid', Unpaid: 'Pending', Void: 'Cancelled', Draft: 'Draft', 'Partially Paid': 'Partially Paid', Refunded: 'Refunded' };

const EU_COUNTRIES = ['Germany', 'France', 'Netherlands', 'Italy', 'Spain', 'Ireland', 'Belgium', 'Austria', 'Portugal', 'Sweden', 'Denmark', 'Finland', 'Poland'];

function taxTypeForCountry(country: string | null | undefined): string {
  if (!country) return 'None';
  if (country === 'India') return 'GST';
  if (EU_COUNTRIES.includes(country)) return 'VAT';
  return 'Sales Tax';
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function monthLabel(d: Date): string {
  return d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
}

@Injectable()
export class PlatformRevenueService {
  constructor(
    private prisma: DatabaseService,
    private auditLogsService: AuditLogsService,
    private orgDetail: PlatformOrgDetailService,
  ) {}

  // ---------------------------------------------------------------------------
  // DASHBOARD
  // ---------------------------------------------------------------------------

  private async computeMrr(): Promise<{ mrr: number; activeOrgCount: number }> {
    const activeSubs = await this.prisma.organizationSubscription.findMany({
      where: { status: 'Active' },
      include: { plan: true },
    });
    let mrr = 0;
    const orgIds = new Set<string>();
    for (const sub of activeSubs) {
      const price = sub.isEnterpriseCustom && sub.customPrice != null ? sub.customPrice : sub.plan.price;
      mrr += price * (MONTHLY_MULTIPLIER[sub.plan.billingCycle] ?? 1);
      orgIds.add(sub.organizationId);
    }
    return { mrr: Math.round(mrr * 100) / 100, activeOrgCount: orgIds.size };
  }

  async getDashboard() {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [{ mrr, activeOrgCount }, revenueToday, revenueThisMonth, newSubscriptions, allInvoicesThisMonthPaid, trialConversions, failedPayments, outstanding, refundsAgg, activeNow, cancelledThisMonth] = await Promise.all([
      this.computeMrr(),
      this.sumPayments({ status: 'Success', createdAt: { gte: todayStart } }),
      this.sumPayments({ status: 'Success', createdAt: { gte: monthStart } }),
      this.prisma.organizationSubscription.count({ where: { startDate: { gte: monthStart } } }),
      this.prisma.subscriptionInvoice.findMany({ where: { status: 'Paid', paidAt: { gte: monthStart } }, select: { subscriptionId: true, createdAt: true } }),
      this.prisma.auditLog.count({ where: { eventType: 'TRIAL_CONVERTED', createdAt: { gte: monthStart } } }),
      this.prisma.subscriptionPayment.count({ where: { status: 'Failed', createdAt: { gte: monthStart } } }),
      this.prisma.subscriptionInvoice.aggregate({ where: { status: 'Unpaid' }, _sum: { amount: true }, _count: true }),
      this.prisma.subscriptionPayment.aggregate({ where: { status: { in: ['Refunded', 'Partially_Refunded'] }, refundedAt: { gte: monthStart } }, _sum: { refundedAmount: true }, _count: true }),
      this.prisma.organizationSubscription.count({ where: { status: 'Active' } }),
      this.prisma.organizationSubscription.count({ where: { status: 'Canceled', cancelledAt: { gte: monthStart } } }),
    ]);

    // Renewals: paid invoices this month that are NOT the earliest invoice for their subscription.
    const bySub = new Map<string, number>();
    for (const inv of allInvoicesThisMonthPaid) bySub.set(inv.subscriptionId, (bySub.get(inv.subscriptionId) || 0) + 1);
    const firstInvoicePerSub = await this.prisma.subscriptionInvoice.groupBy({ by: ['subscriptionId'], _min: { createdAt: true } });
    const firstAtBySub = new Map(firstInvoicePerSub.map((r) => [r.subscriptionId, r._min.createdAt]));
    const renewals = allInvoicesThisMonthPaid.filter((inv) => {
      const first = firstAtBySub.get(inv.subscriptionId);
      return first && new Date(first).getTime() !== new Date(inv.createdAt).getTime();
    }).length;

    const activeAtStart = activeNow + cancelledThisMonth;
    const churnRate = activeAtStart > 0 ? Math.round((cancelledThisMonth / activeAtStart) * 1000) / 10 : 0;
    const arpo = activeOrgCount > 0 ? Math.round((mrr / activeOrgCount) * 100) / 100 : 0;

    return {
      mrr,
      arr: Math.round(mrr * 12 * 100) / 100,
      revenueToday: Math.round(revenueToday * 100) / 100,
      revenueThisMonth: Math.round(revenueThisMonth * 100) / 100,
      newSubscriptions,
      renewals,
      trialConversions,
      failedPayments,
      outstandingInvoices: { count: outstanding._count, amount: Math.round((outstanding._sum.amount || 0) * 100) / 100 },
      refunds: { count: refundsAgg._count, amount: Math.round((refundsAgg._sum.refundedAmount || 0) * 100) / 100 },
      churnRate,
      arpo,
    };
  }

  private async sumPayments(where: any): Promise<number> {
    const agg = await this.prisma.subscriptionPayment.aggregate({ where, _sum: { amount: true } });
    return agg._sum.amount || 0;
  }

  /** Matches RevenueAnalytics.tsx's `RevenueData` shape exactly - wiring this in is a 2-line change to that already-built widget. */
  async getWidgetSummary() {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now.getTime() - 7 * DAY_MS);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [today, thisWeek, thisMonth, thisYear, { mrr, activeOrgCount }, mrrTrend] = await Promise.all([
      this.sumPayments({ status: 'Success', createdAt: { gte: todayStart } }),
      this.sumPayments({ status: 'Success', createdAt: { gte: weekStart } }),
      this.sumPayments({ status: 'Success', createdAt: { gte: monthStart } }),
      this.sumPayments({ status: 'Success', createdAt: { gte: yearStart } }),
      this.computeMrr(),
      this.buildMrrTrend(6),
    ]);

    return {
      today: Math.round(today * 100) / 100,
      thisWeek: Math.round(thisWeek * 100) / 100,
      thisMonth: Math.round(thisMonth * 100) / 100,
      thisYear: Math.round(thisYear * 100) / 100,
      arpo: activeOrgCount > 0 ? Math.round((mrr / activeOrgCount) * 100) / 100 : 0,
      mrrTrend,
    };
  }

  /** Reconstructs approximate MRR at the end of each of the last N months from subscription start/cancel dates + plan pricing. A real computation, not fabricated - but a point-in-time approximation since historical plan-price changes aren't tracked. */
  private async buildMrrTrend(months: number): Promise<{ month: string; value: number }[]> {
    const subs = await this.prisma.organizationSubscription.findMany({
      select: { startDate: true, cancelledAt: true, status: true, customPrice: true, isEnterpriseCustom: true, plan: { select: { price: true, billingCycle: true } } },
    });

    const points: { month: string; value: number }[] = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      let value = 0;
      for (const sub of subs) {
        const started = new Date(sub.startDate) <= monthEnd;
        const stillGoing = !sub.cancelledAt || new Date(sub.cancelledAt) > monthEnd;
        if (started && stillGoing) {
          const price = sub.isEnterpriseCustom && sub.customPrice != null ? sub.customPrice : sub.plan.price;
          value += price * (MONTHLY_MULTIPLIER[sub.plan.billingCycle] ?? 1);
        }
      }
      points.push({ month: monthLabel(monthEnd), value: Math.round(value * 100) / 100 });
    }
    return points;
  }

  // ---------------------------------------------------------------------------
  // CHARTS
  // ---------------------------------------------------------------------------

  async getRevenueCharts() {
    const [revenueTrend, mrrTrend, subscriptionGrowth, byCountry, byPlan, byGateway] = await Promise.all([
      this.buildRevenueTrend(12),
      this.buildMrrTrend(6),
      this.buildSubscriptionGrowth(6),
      this.buildRevenueByCountry(),
      this.buildRevenueByPlan(),
      this.buildRevenueByGateway(),
    ]);

    const arrTrend = mrrTrend.map((p) => ({ month: p.month, value: Math.round(p.value * 12 * 100) / 100 }));
    const forecast = this.projectForward(mrrTrend, 3);

    return { revenueTrend, mrrGrowth: mrrTrend, arrGrowth: arrTrend, subscriptionGrowth, revenueByCountry: byCountry, revenueByPlan: byPlan, revenueByPaymentMethod: byGateway, revenueForecast: forecast };
  }

  private async buildRevenueTrend(months: number): Promise<{ month: string; value: number }[]> {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
    const payments = await this.prisma.subscriptionPayment.findMany({ where: { status: 'Success', createdAt: { gte: start } }, select: { amount: true, createdAt: true } });

    const byMonth = new Map<string, number>();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      byMonth.set(monthKey(d), 0);
    }
    for (const p of payments) {
      const key = monthKey(new Date(p.createdAt));
      if (byMonth.has(key)) byMonth.set(key, (byMonth.get(key) || 0) + p.amount);
    }
    return Array.from(byMonth.entries()).map(([key, value]) => {
      const [y, m] = key.split('-').map(Number);
      return { month: monthLabel(new Date(y, m - 1, 1)), value: Math.round(value * 100) / 100 };
    });
  }

  private async buildSubscriptionGrowth(months: number): Promise<{ month: string; value: number }[]> {
    const subs = await this.prisma.organizationSubscription.findMany({ select: { startDate: true, cancelledAt: true } });
    const now = new Date();
    const points: { month: string; value: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const count = subs.filter((s) => new Date(s.startDate) <= monthEnd && (!s.cancelledAt || new Date(s.cancelledAt) > monthEnd)).length;
      points.push({ month: monthLabel(monthEnd), value: count });
    }
    return points;
  }

  private async buildRevenueByCountry() {
    const payments = await this.prisma.subscriptionPayment.findMany({
      where: { status: 'Success' },
      include: { invoice: { include: { subscription: { include: { organization: { select: { country: true } } } } } } },
    });
    const byCountry = new Map<string, number>();
    for (const p of payments) {
      const country = p.invoice.subscription.organization.country || 'Unknown';
      byCountry.set(country, (byCountry.get(country) || 0) + p.amount);
    }
    return Array.from(byCountry.entries()).map(([country, value]) => ({ country, value: Math.round(value * 100) / 100 })).sort((a, b) => b.value - a.value);
  }

  private async buildRevenueByPlan() {
    const payments = await this.prisma.subscriptionPayment.findMany({
      where: { status: 'Success' },
      include: { invoice: { include: { subscription: { include: { plan: { select: { name: true } } } } } } },
    });
    const byPlan = new Map<string, number>();
    for (const p of payments) {
      const plan = p.invoice.subscription.plan.name;
      byPlan.set(plan, (byPlan.get(plan) || 0) + p.amount);
    }
    return Array.from(byPlan.entries()).map(([plan, value]) => ({ plan, value: Math.round(value * 100) / 100 })).sort((a, b) => b.value - a.value);
  }

  private async buildRevenueByGateway() {
    const payments = await this.prisma.subscriptionPayment.findMany({ where: { status: 'Success' }, select: { paymentMethod: true, amount: true } });
    const byGateway = new Map<string, number>();
    for (const p of payments) {
      const gateway = p.paymentMethod || 'Manual';
      byGateway.set(gateway, (byGateway.get(gateway) || 0) + p.amount);
    }
    return Array.from(byGateway.entries()).map(([gateway, value]) => ({ gateway, value: Math.round(value * 100) / 100 })).sort((a, b) => b.value - a.value);
  }

  /** Simple trailing-linear-trend projection - labeled as a projection everywhere in the UI, not a guarantee. */
  private projectForward(series: { month: string; value: number }[], count: number): { month: string; value: number }[] {
    const tail = series.slice(-3);
    if (tail.length < 2) return [];
    const avgDelta = tail.slice(1).reduce((sum, p, i) => sum + (p.value - tail[i].value), 0) / (tail.length - 1);
    const last = series[series.length - 1];
    const [ly, lm] = [new Date().getFullYear(), new Date().getMonth()];
    const points: { month: string; value: number }[] = [];
    let value = last.value;
    for (let i = 1; i <= count; i++) {
      value = Math.max(0, value + avgDelta);
      const d = new Date(ly, lm + i, 1);
      points.push({ month: monthLabel(d), value: Math.round(value * 100) / 100 });
    }
    return points;
  }

  // ---------------------------------------------------------------------------
  // SUBSCRIPTION ANALYTICS
  // ---------------------------------------------------------------------------

  async getSubscriptionAnalytics() {
    const [byPlan, byStatusRaw] = await Promise.all([
      this.prisma.organizationSubscription.groupBy({ by: ['planId'], _count: true }),
      this.prisma.organizationSubscription.groupBy({ by: ['status'], _count: true }),
    ]);
    const plans = await this.prisma.subscriptionPlan.findMany({ select: { id: true, name: true, badge: true } });
    const planNameById = new Map(plans.map((p) => [p.id, p.name]));

    return {
      byPlan: byPlan.map((r) => ({ plan: planNameById.get(r.planId) || 'Unknown', count: r._count })),
      byStatus: byStatusRaw.map((r) => ({ status: r.status, count: r._count })),
    };
  }

  // ---------------------------------------------------------------------------
  // INVOICES / PAYMENTS / REFUNDS
  // ---------------------------------------------------------------------------

  async listInvoices(query: ListInvoicesDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) { const end = new Date(query.endDate); end.setHours(23, 59, 59, 999); where.createdAt.lte = end; }
    }
    const subWhere: any = {};
    if (query.organizationId) subWhere.organizationId = query.organizationId;
    if (query.planId) subWhere.planId = query.planId;
    if (Object.keys(subWhere).length) where.subscription = subWhere;
    if (query.search) {
      where.OR = [
        { id: { contains: query.search, mode: 'insensitive' } },
        { subscription: { organization: { name: { contains: query.search, mode: 'insensitive' } } } },
      ];
    }

    const rows = await this.prisma.subscriptionInvoice.findMany({
      where,
      include: { subscription: { include: { organization: { select: { name: true, country: true } }, plan: { select: { name: true } } } }, payments: true },
      orderBy: { createdAt: query.sortDir === 'asc' ? 'asc' : 'desc' },
    });

    let enriched = rows.map((inv) => this.enrichInvoice(inv));
    if (query.overdueOnly === 'true') enriched = enriched.filter((i) => i.derivedStatus === 'Overdue');

    const total = enriched.length;
    const pageItems = enriched.slice((page - 1) * limit, page * limit);
    return { data: pageItems, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  private enrichInvoice(inv: any) {
    const isOverdue = inv.status === 'Unpaid' && new Date(inv.dueDate) < new Date();
    return {
      id: inv.id,
      organizationName: inv.subscription.organization.name,
      organizationId: inv.subscription.organizationId,
      planName: inv.subscription.plan.name,
      amount: inv.amount,
      taxAmount: inv.taxAmount,
      taxRate: inv.taxRate,
      status: inv.status,
      statusLabel: INVOICE_STATUS_LABELS[inv.status] || inv.status,
      derivedStatus: isOverdue ? 'Overdue' : inv.status,
      dueDate: inv.dueDate,
      paidAt: inv.paidAt,
      createdAt: inv.createdAt,
      description: inv.description,
      paymentMethod: inv.payments[0]?.paymentMethod || null,
    };
  }

  async listPayments(query: ListPaymentsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));

    // Excludes the internal seed idempotency marker row (transactionId
    // 'PLT012_SEED_MARKER') - not a real payment, never meant to be visible.
    const where: any = { transactionId: { not: 'PLT012_SEED_MARKER' } };
    if (query.status) where.status = query.status;
    if (query.gateway) where.paymentMethod = query.gateway;
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) { const end = new Date(query.endDate); end.setHours(23, 59, 59, 999); where.createdAt.lte = end; }
    }
    const invoiceWhere: any = {};
    if (query.organizationId) invoiceWhere.subscription = { organizationId: query.organizationId };
    if (Object.keys(invoiceWhere).length) where.invoice = invoiceWhere;
    if (query.search) {
      where.OR = [
        { id: { contains: query.search, mode: 'insensitive' } },
        { transactionId: { contains: query.search, mode: 'insensitive' } },
        { invoice: { subscription: { organization: { name: { contains: query.search, mode: 'insensitive' } } } } },
      ];
    }

    const [total, rows] = await Promise.all([
      this.prisma.subscriptionPayment.count({ where }),
      this.prisma.subscriptionPayment.findMany({
        where,
        include: { invoice: { include: { subscription: { include: { organization: { select: { name: true } } } } } } },
        orderBy: { createdAt: query.sortDir === 'asc' ? 'asc' : 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: rows.map((p) => this.enrichPayment(p)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private enrichPayment(p: any) {
    return {
      id: p.id,
      organizationName: p.invoice.subscription.organization.name,
      organizationId: p.invoice.subscription.organizationId,
      invoiceId: p.invoiceId,
      amount: p.amount,
      currency: 'USD',
      gateway: p.paymentMethod || 'Manual',
      status: p.status,
      statusLabel: PAYMENT_STATUS_LABELS[p.status] || p.status,
      transactionId: p.transactionId,
      refundedAmount: p.refundedAmount,
      refundedAt: p.refundedAt,
      refundReason: p.refundReason,
      createdAt: p.createdAt,
    };
  }

  async listRefunds(query: { page?: number; limit?: number; organizationId?: string; startDate?: string; endDate?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));

    const where: any = { status: { in: ['Refunded', 'Partially_Refunded'] } };
    if (query.organizationId) where.invoice = { subscription: { organizationId: query.organizationId } };
    if (query.startDate || query.endDate) {
      where.refundedAt = {};
      if (query.startDate) where.refundedAt.gte = new Date(query.startDate);
      if (query.endDate) { const end = new Date(query.endDate); end.setHours(23, 59, 59, 999); where.refundedAt.lte = end; }
    }

    const [total, rows] = await Promise.all([
      this.prisma.subscriptionPayment.count({ where }),
      this.prisma.subscriptionPayment.findMany({
        where,
        include: { invoice: { include: { subscription: { include: { organization: { select: { name: true } } } } } } },
        orderBy: { refundedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    // "Processed By" is derived from the real audit trail (the "Payment
    // Refunded" event the existing refundPayment() already logs) rather than
    // a new stored column.
    const auditEntries = await this.prisma.auditLog.findMany({
      where: { eventType: 'PAYMENT_REFUNDED', entityId: { in: rows.map((r) => r.id) } },
      orderBy: { createdAt: 'desc' },
      select: { entityId: true, user: true },
    });
    const processedByByPaymentId = new Map<string, string>();
    for (const entry of auditEntries) {
      if (entry.entityId && !processedByByPaymentId.has(entry.entityId)) processedByByPaymentId.set(entry.entityId, entry.user);
    }

    return {
      data: rows.map((p) => ({
        id: p.id,
        organizationName: p.invoice.subscription.organization.name,
        organizationId: p.invoice.subscription.organizationId,
        refundAmount: p.refundedAmount,
        reason: p.refundReason,
        processedBy: processedByByPaymentId.get(p.id) || null,
        status: p.status,
        gateway: p.paymentMethod || 'Manual',
        date: p.refundedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ---------------------------------------------------------------------------
  // MUTATIONS - thin orchestration over the existing PlatformOrgDetailService
  // ---------------------------------------------------------------------------

  async generateInvoice(dto: PlatformGenerateInvoiceDto, actorUserId: string) {
    const inner: GenerateInvoiceDto = { amount: dto.amount, description: dto.description, dueDate: dto.dueDate };
    const invoice = await this.orgDetail.generateInvoice(dto.organizationId, inner, actorUserId);
    if (dto.taxRate != null) {
      const taxAmount = Math.round(dto.amount * (dto.taxRate / 100) * 100) / 100;
      await this.prisma.subscriptionInvoice.update({ where: { id: invoice.id }, data: { taxRate: dto.taxRate, taxAmount } });
    }
    return invoice;
  }

  async refundPayment(paymentId: string, dto: PlatformRefundPaymentDto, actorUserId: string) {
    const inner: RefundPaymentDto = { amount: dto.amount, reason: dto.reason };
    return this.orgDetail.refundPayment(dto.organizationId, paymentId, inner, actorUserId);
  }

  async applyCoupon(dto: PlatformApplyCouponDto, actorUserId: string) {
    const inner: ApplyCouponDto = { code: dto.code };
    return this.orgDetail.applyCoupon(dto.organizationId, inner, actorUserId);
  }

  async extendTrial(dto: PlatformExtendTrialDto, actorUserId: string) {
    const inner: ExtendTrialDto = { days: dto.days };
    return this.orgDetail.extendTrial(dto.organizationId, inner, actorUserId);
  }

  /** No real payment gateway is integrated (documented scope boundary) - this simulates a manual retry by recording a new successful payment against the same invoice. */
  async retryPayment(paymentId: string, organizationId: string, actorUserId: string) {
    const original = await this.prisma.subscriptionPayment.findUnique({ where: { id: paymentId }, include: { invoice: { include: { subscription: true } } } });
    if (!original) throw new NotFoundException('Payment not found');
    if (original.invoice.subscription.organizationId !== organizationId) throw new BadRequestException('Payment does not belong to this organization.');
    if (original.status !== 'Failed') throw new BadRequestException('Only failed payments can be retried.');

    const retried = await this.prisma.subscriptionPayment.create({
      data: { invoiceId: original.invoiceId, amount: original.amount, status: 'Success', paymentMethod: original.paymentMethod, transactionId: `retry-${Date.now()}` },
    });
    await this.prisma.subscriptionInvoice.update({ where: { id: original.invoiceId }, data: { status: 'Paid', paidAt: new Date() } });

    const actorName = await this.getActorName(actorUserId);
    await this.logEvent(actorUserId, 'Payment Retried', `${actorName} retried a failed payment (${original.amount}) - now recorded as successful.`, organizationId, retried.id, 'PAYMENT_RETRIED');
    return retried;
  }

  // ---------------------------------------------------------------------------
  // COUPON ANALYTICS (read-only - mutations stay on the existing coupons module)
  // ---------------------------------------------------------------------------

  async getCouponAnalytics() {
    const coupons = await this.prisma.coupon.findMany({
      include: { redemptions: { where: { removedAt: null }, include: { subscription: { include: { organization: { select: { name: true } } } } } } },
      orderBy: { createdAt: 'desc' },
    });
    const now = new Date();
    return coupons.map((c) => ({
      id: c.id,
      code: c.code,
      discountType: c.discountType,
      discountValue: c.discountValue,
      organizationsUsing: c.redemptions.map((r) => r.subscription.organization.name),
      usageCount: c.redemptionCount,
      maxUses: c.maxRedemptions,
      expiry: c.validUntil,
      status: !c.isActive ? 'Inactive' : c.validUntil && new Date(c.validUntil) < now ? 'Expired' : c.maxRedemptions && c.redemptionCount >= c.maxRedemptions ? 'Exhausted' : 'Active',
      totalDiscountApplied: Math.round(c.redemptions.reduce((sum, r) => sum + r.discountApplied, 0) * 100) / 100,
    }));
  }

  // ---------------------------------------------------------------------------
  // ORGANIZATION BILLING LOOKUP
  // ---------------------------------------------------------------------------

  async searchOrganizations(search: string) {
    return this.prisma.organization.findMany({
      where: { name: { contains: search, mode: 'insensitive' }, deletedAt: null },
      select: { id: true, name: true, country: true },
      take: 10,
    });
  }

  /** Condensed billing snapshot - calls the existing getSubscription() (no audit-log side effect, unlike getOverview) rather than duplicating its logic. */
  async getOrgBillingSnapshot(organizationId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true, name: true, country: true } });
    if (!org) throw new NotFoundException('Organization not found');
    const subscription = await this.orgDetail.getSubscription(organizationId);
    return { organization: org, subscription };
  }

  // ---------------------------------------------------------------------------
  // FORECASTING
  // ---------------------------------------------------------------------------

  async getForecast() {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * DAY_MS);
    const in14 = new Date(now.getTime() + 14 * DAY_MS);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [mrrTrend, upcomingRenewals, upcomingExpirations, activeNow, cancelledThisMonth] = await Promise.all([
      this.buildMrrTrend(6),
      this.prisma.organizationSubscription.findMany({
        where: { status: 'Active', endDate: { lte: in30, gte: now }, autoRenew: true },
        include: { organization: { select: { name: true } }, plan: { select: { name: true, price: true } } },
        orderBy: { endDate: 'asc' },
      }),
      this.prisma.organizationSubscription.findMany({
        where: { status: 'Trialing', trialEndDate: { lte: in14, gte: now } },
        include: { organization: { select: { name: true } }, plan: { select: { name: true } } },
        orderBy: { trialEndDate: 'asc' },
      }),
      this.prisma.organizationSubscription.count({ where: { status: 'Active' } }),
      this.prisma.organizationSubscription.count({ where: { status: 'Canceled', cancelledAt: { gte: monthStart } } }),
    ]);

    const projected = this.projectForward(mrrTrend, 1)[0];
    const trailingChurn = activeNow > 0 ? (cancelledThisMonth / (activeNow + cancelledThisMonth)) * 100 : 0;

    return {
      projectedRevenueNextMonth: projected?.value || 0,
      predictedMrr: projected?.value || 0,
      expectedChurnRate: Math.round(trailingChurn * 10) / 10,
      expectedRenewals: upcomingRenewals.length,
      upcomingRenewals: upcomingRenewals.map((r) => ({ organizationName: r.organization.name, planName: r.plan.name, endDate: r.endDate, value: r.plan.price })),
      upcomingExpirations: upcomingExpirations.map((r) => ({ organizationName: r.organization.name, planName: r.plan.name, trialEndDate: r.trialEndDate })),
    };
  }

  // ---------------------------------------------------------------------------
  // REPORTS
  // ---------------------------------------------------------------------------

  async getReports(type: string) {
    switch (type) {
      case 'by-month': return this.buildRevenueTrend(12);
      case 'by-country': return this.buildRevenueByCountry();
      case 'by-plan': return this.buildRevenueByPlan();
      case 'by-sales-channel': return this.buildRevenueBySalesChannel();
      case 'tax-summary': return this.getTaxSummary();
      case 'gateway-summary': return this.buildRevenueByGateway();
      case 'outstanding-invoices': return this.buildOutstandingInvoicesReport();
      default: throw new BadRequestException(`Unknown report type "${type}".`);
    }
  }

  private async buildRevenueBySalesChannel() {
    const subs = await this.prisma.organizationSubscription.findMany({ select: { salesChannel: true, plan: { select: { price: true, billingCycle: true } }, status: true, customPrice: true, isEnterpriseCustom: true } });
    const byChannel = new Map<string, number>();
    for (const s of subs.filter((s) => s.status === 'Active')) {
      const channel = s.salesChannel || 'Self-serve';
      const price = s.isEnterpriseCustom && s.customPrice != null ? s.customPrice : s.plan.price;
      byChannel.set(channel, (byChannel.get(channel) || 0) + price * (MONTHLY_MULTIPLIER[s.plan.billingCycle] ?? 1));
    }
    return Array.from(byChannel.entries()).map(([channel, value]) => ({ channel, value: Math.round(value * 100) / 100 })).sort((a, b) => b.value - a.value);
  }

  async getTaxSummary() {
    const invoices = await this.prisma.subscriptionInvoice.findMany({
      where: { taxAmount: { not: null } },
      include: { subscription: { include: { organization: { select: { country: true } } } } },
    });
    const byType = new Map<string, { taxCollected: number; count: number }>();
    const byCountry = new Map<string, number>();
    for (const inv of invoices) {
      const country = inv.subscription.organization.country;
      const type = taxTypeForCountry(country);
      const bucket = byType.get(type) || { taxCollected: 0, count: 0 };
      bucket.taxCollected += inv.taxAmount || 0;
      bucket.count += 1;
      byType.set(type, bucket);
      byCountry.set(country || 'Unknown', (byCountry.get(country || 'Unknown') || 0) + (inv.taxAmount || 0));
    }
    return {
      totalTaxCollected: Math.round(Array.from(byType.values()).reduce((s, b) => s + b.taxCollected, 0) * 100) / 100,
      byType: Array.from(byType.entries()).map(([type, b]) => ({ type, taxCollected: Math.round(b.taxCollected * 100) / 100, invoiceCount: b.count })),
      byCountry: Array.from(byCountry.entries()).map(([country, taxCollected]) => ({ country, taxCollected: Math.round(taxCollected * 100) / 100 })).sort((a, b) => b.taxCollected - a.taxCollected),
    };
  }

  private async buildOutstandingInvoicesReport() {
    const invoices = await this.prisma.subscriptionInvoice.findMany({
      where: { status: 'Unpaid' },
      include: { subscription: { include: { organization: { select: { name: true } } } } },
      orderBy: { dueDate: 'asc' },
    });
    const now = new Date();
    return invoices.map((inv) => ({
      id: inv.id,
      organizationName: inv.subscription.organization.name,
      amount: inv.amount,
      dueDate: inv.dueDate,
      overdue: new Date(inv.dueDate) < now,
      daysOverdue: new Date(inv.dueDate) < now ? Math.ceil((now.getTime() - new Date(inv.dueDate).getTime()) / DAY_MS) : 0,
    }));
  }

  // ---------------------------------------------------------------------------
  // PAYMENT GATEWAYS
  // ---------------------------------------------------------------------------

  listGateways() {
    return this.prisma.paymentGateway.findMany({ orderBy: { order: 'asc' } });
  }

  async updateGateway(key: string, isActive: boolean, actorUserId: string) {
    const gateway = await this.prisma.paymentGateway.findUnique({ where: { key } });
    if (!gateway) throw new NotFoundException('Payment gateway not found');
    const updated = await this.prisma.paymentGateway.update({ where: { key }, data: { isActive } });
    await this.logEvent(actorUserId, 'Payment Gateway Updated', `${isActive ? 'Enabled' : 'Disabled'} the ${gateway.label} gateway.`, null, key, 'PAYMENT_GATEWAY_UPDATED');
    return updated;
  }

  // ---------------------------------------------------------------------------
  // NOTIFICATIONS (derived, UI-only - no delivery infra exists in this codebase)
  // ---------------------------------------------------------------------------

  async getNotifications() {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - DAY_MS);
    const in7 = new Date(now.getTime() + 7 * DAY_MS);

    const [failedPayments, overdueInvoices, trialsEnding, recentRenewals, recentRefunds, churnRate] = await Promise.all([
      this.prisma.subscriptionPayment.findMany({ where: { status: 'Failed', createdAt: { gte: dayAgo } }, include: { invoice: { include: { subscription: { include: { organization: { select: { name: true } } } } } } }, take: 10 }),
      this.prisma.subscriptionInvoice.findMany({ where: { status: 'Unpaid', dueDate: { lt: now } }, include: { subscription: { include: { organization: { select: { name: true } } } } }, take: 10 }),
      this.prisma.organizationSubscription.findMany({ where: { status: 'Trialing', trialEndDate: { gte: now, lte: in7 } }, include: { organization: { select: { name: true } } }, take: 10 }),
      this.prisma.subscriptionInvoice.findMany({ where: { status: 'Paid', paidAt: { gte: dayAgo } }, include: { subscription: { include: { organization: { select: { name: true } } } } }, take: 10 }),
      this.prisma.subscriptionPayment.findMany({ where: { status: { in: ['Refunded', 'Partially_Refunded'] }, refundedAt: { gte: dayAgo } }, include: { invoice: { include: { subscription: { include: { organization: { select: { name: true } } } } } } }, take: 10 }),
      this.getDashboard().then((d) => d.churnRate),
    ]);

    return {
      paymentFailed: failedPayments.map((p) => ({ id: p.id, organizationName: p.invoice.subscription.organization.name, amount: p.amount, createdAt: p.createdAt })),
      invoiceOverdue: overdueInvoices.map((i) => ({ id: i.id, organizationName: i.subscription.organization.name, amount: i.amount, dueDate: i.dueDate })),
      trialEnding: trialsEnding.map((s) => ({ organizationId: s.organizationId, organizationName: s.organization.name, trialEndDate: s.trialEndDate })),
      subscriptionRenewed: recentRenewals.map((i) => ({ id: i.id, organizationName: i.subscription.organization.name, amount: i.amount, paidAt: i.paidAt })),
      refundProcessed: recentRefunds.map((p) => ({ id: p.id, organizationName: p.invoice.subscription.organization.name, amount: p.refundedAmount, refundedAt: p.refundedAt })),
      highChurnAlert: churnRate > 10 ? { churnRate } : null,
    };
  }

  // ---------------------------------------------------------------------------
  // EXPORT
  // ---------------------------------------------------------------------------

  async recordExport(dto: RecordRevenueExportDto, actorUserId: string) {
    const actorName = await this.getActorName(actorUserId);
    await this.logEvent(actorUserId, 'Revenue Data Exported', `${actorName} exported ${dto.rowCount} row(s) as ${dto.format}.`, null, null, 'REVENUE_EXPORTED');
    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private async getActorName(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user?.fullName || 'Platform Admin';
  }

  private async logEvent(actorUserId: string, action: string, details: string, organizationId: string | null, entityId: string | null, eventType?: string) {
    const actorName = await this.getActorName(actorUserId);
    await this.auditLogsService.logEvent({
      organizationId,
      userId: actorUserId,
      action,
      user: actorName,
      details,
      eventType,
      eventCategory: AUDIT_CATEGORY,
      entityType: 'Revenue',
      entityId: entityId || undefined,
    });
  }
}
