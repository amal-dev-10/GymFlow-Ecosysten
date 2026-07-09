import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';
import { DatabaseService } from '../../core/database/database.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { TrackUsageDto } from './dto/track-usage.dto';

// Constructed lazily (not at module load) so importing this file never
// throws when RAZORPAY_KEY_ID/SECRET aren't set yet - e.g. in unit tests,
// or before an environment has been configured with real gateway keys.
let razorpayClient: Razorpay | null = null;
function getRazorpayClient(): Razorpay {
  if (!razorpayClient) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not configured');
    }
    razorpayClient = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayClient;
}

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: DatabaseService) {}

  // ---------------------------------------------------------------------------
  // PLANS (tenant-facing, read-only - admin management lives under /v1/platform/plans)
  // ---------------------------------------------------------------------------

  async getPlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { status: 'ACTIVE', visibility: 'PUBLIC' },
      orderBy: { displayOrder: 'asc' },
      include: { resourceLimits: { include: { resource: true } }, featureAccess: { include: { feature: true } } },
    });
  }

  // ---------------------------------------------------------------------------
  // SUBSCRIPTION & INVOICES (per organization)
  // ---------------------------------------------------------------------------

  private computeEndDate(now: Date, billingCycle: string): Date {
    const endDate = new Date(now);
    if (billingCycle === 'YEARLY' || billingCycle === 'ENTERPRISE' || billingCycle === 'CUSTOM') {
      endDate.setFullYear(now.getFullYear() + 1);
    } else if (billingCycle === 'QUARTERLY') {
      endDate.setMonth(now.getMonth() + 3);
    } else if (billingCycle === 'HALF_YEARLY') {
      endDate.setMonth(now.getMonth() + 6);
    } else if (billingCycle === 'FREE') {
      endDate.setFullYear(now.getFullYear() + 100);
    } else {
      endDate.setMonth(now.getMonth() + 1);
    }
    return endDate;
  }

  /** Activates a plan directly with no payment step - only valid for free (price 0) plans. */
  async subscribe(organizationId: string, dto: SubscribeDto) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: dto.planId, status: 'ACTIVE' },
      include: { resourceLimits: true },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }
    if (plan.price > 0) {
      throw new BadRequestException('This plan requires payment - use the checkout flow instead');
    }

    return this.activatePlan(organizationId, plan, 0, {
      status: 'Success',
      paymentMethod: 'None',
      provider: 'mock',
      transactionId: `free_${Date.now()}`,
    });
  }

  /**
   * Credits the unused portion of the organization's current paid plan
   * against the new plan's full price, so upgrading mid-cycle doesn't charge
   * the full sticker price on top of what was already paid this cycle.
   * Downgrading (or switching when the credit covers the new plan in full)
   * resolves to 0 due - the remaining credit is forfeited rather than
   * refunded, which keeps this from ever needing a negative charge.
   *
   * Only applies credit when the existing and target plans share a
   * currency - subtracting a rupee credit from a dollar price would produce
   * a number that looks like a discount but isn't one, since this system has
   * no exchange-rate conversion. A currency mismatch just charges full price.
   */
  private async computeAmountDue(organizationId: string, targetPlan: { price: number; currency: string }): Promise<{ amountDue: number; credit: number; creditCurrency: string | null }> {
    const existing = await this.prisma.organizationSubscription.findFirst({
      where: { organizationId, status: 'Active' },
      include: { plan: { select: { price: true, currency: true } } },
    });

    if (!existing || existing.plan.currency !== targetPlan.currency) {
      return { amountDue: targetPlan.price, credit: 0, creditCurrency: null };
    }

    const now = Date.now();
    const totalMs = existing.endDate.getTime() - existing.startDate.getTime();
    const remainingMs = Math.max(0, existing.endDate.getTime() - now);
    const unusedFraction = totalMs > 0 ? Math.min(1, remainingMs / totalMs) : 0;
    const credit = Math.round(unusedFraction * existing.plan.price * 100) / 100;
    const amountDue = Math.max(0, Math.round((targetPlan.price - credit) * 100) / 100);

    return { amountDue, credit, creditCurrency: existing.plan.currency };
  }

  /** Shared transaction: cancel the current active subscription and activate a new one. */
  private async activatePlan(
    organizationId: string,
    plan: { id: string; price: number; billingCycle: string; resourceLimits: { resourceKey: string; limitType: string }[] },
    amountCharged: number,
    payment: { status: string; paymentMethod: string; provider: string; transactionId: string; gatewayOrderId?: string; gatewayPaymentId?: string; gatewaySignature?: string },
    invoiceDescription?: string,
  ) {
    const now = new Date();
    const endDate = this.computeEndDate(now, plan.billingCycle);

    return this.prisma.$transaction(async (tx) => {
      await tx.organizationSubscription.updateMany({
        where: { organizationId, status: 'Active' },
        data: { status: 'Canceled' },
      });

      const subscription = await tx.organizationSubscription.create({
        data: { organizationId, planId: plan.id, status: 'Active', startDate: now, endDate },
      });

      const invoice = await tx.subscriptionInvoice.create({
        data: { subscriptionId: subscription.id, amount: amountCharged, status: 'Paid', dueDate: now, paidAt: now, description: invoiceDescription },
      });

      await tx.subscriptionPayment.create({
        data: {
          invoiceId: invoice.id,
          amount: amountCharged,
          status: payment.status,
          paymentMethod: payment.paymentMethod,
          transactionId: payment.transactionId,
          provider: payment.provider,
          gatewayOrderId: payment.gatewayOrderId,
          gatewayPaymentId: payment.gatewayPaymentId,
          gatewaySignature: payment.gatewaySignature,
        },
      });

      const limitedResources = plan.resourceLimits.filter((r) => r.limitType === 'LIMITED');
      if (limitedResources.length > 0) {
        await tx.subscriptionUsage.createMany({
          data: limitedResources.map((r) => ({
            subscriptionId: subscription.id,
            featureName: r.resourceKey,
            currentValue: 0,
          })),
        });
      }

      return { subscription, invoice };
    });
  }

  // ---------------------------------------------------------------------------
  // RAZORPAY CHECKOUT (paid plans)
  // ---------------------------------------------------------------------------

  /**
   * Creates a Razorpay order for the AMOUNT ACTUALLY DUE after crediting any
   * unused time left on the org's current paid plan - not the new plan's
   * full sticker price, so upgrading mid-cycle doesn't double-charge for
   * time already paid for. No DB row is written yet - the subscription only
   * activates once verifyPayment confirms a valid signature, so an
   * abandoned checkout leaves no half-applied state. If the credit fully
   * covers the new plan (e.g. a downgrade), it activates immediately with
   * no Razorpay step at all.
   */
  async createCheckoutOrder(organizationId: string, dto: SubscribeDto) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: dto.planId, status: 'ACTIVE' },
      include: { resourceLimits: true },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    const { amountDue, credit, creditCurrency } = await this.computeAmountDue(organizationId, plan);

    if (amountDue <= 0) {
      const result = await this.activatePlan(
        organizationId,
        plan,
        0,
        { status: 'Success', paymentMethod: 'None', provider: 'mock', transactionId: `credit_${Date.now()}` },
        credit > 0 ? `Fully covered by ${creditCurrency} ${credit} of unused credit from the previous plan` : undefined,
      );
      return { free: true, credit, ...result };
    }

    const order = await getRazorpayClient().orders.create({
      amount: Math.round(amountDue * 100), // Razorpay expects the smallest currency subunit
      currency: plan.currency || 'INR',
      receipt: `sub_${organizationId.slice(0, 8)}_${Date.now()}`,
      notes: { organizationId, planId: plan.id },
    });

    return {
      free: false,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      planName: plan.name,
      credit,
      fullPrice: plan.price,
    };
  }

  /**
   * Verifies the Razorpay payment signature server-side, then activates the
   * plan. Never trusts a client-only "payment succeeded" claim, and never
   * trusts the client-supplied planId/amount either - both are re-derived
   * from the order Razorpay actually processed (fetched fresh from Razorpay,
   * keyed off the signed order_id) so a tampered request body can't activate
   * a different, more expensive plan than what was actually paid for.
   */
  async verifyPayment(organizationId: string, dto: VerifyPaymentDto) {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${dto.razorpayOrderId}|${dto.razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== dto.razorpaySignature) {
      throw new BadRequestException('Payment verification failed - signature mismatch');
    }

    const order: any = await getRazorpayClient().orders.fetch(dto.razorpayOrderId);
    const notes = (order.notes || {}) as { organizationId?: string; planId?: string };

    if (notes.organizationId !== organizationId) {
      throw new BadRequestException('This payment order does not belong to the current organization');
    }

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: notes.planId, status: 'ACTIVE' },
      include: { resourceLimits: true },
    });
    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    const amountCharged = Number(order.amount) / 100;

    return this.activatePlan(organizationId, plan, amountCharged, {
      status: 'Success',
      paymentMethod: 'Razorpay',
      provider: 'razorpay',
      transactionId: dto.razorpayPaymentId,
      gatewayOrderId: dto.razorpayOrderId,
      gatewayPaymentId: dto.razorpayPaymentId,
      gatewaySignature: dto.razorpaySignature,
    });
  }

  async getSubscription(organizationId: string) {
    const subscription = await this.prisma.organizationSubscription.findFirst({
      where: { organizationId, status: 'Active' },
      include: {
        plan: {
          include: { resourceLimits: { include: { resource: true } }, featureAccess: { include: { feature: true } } },
        },
        usages: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException('No active subscription found for this organization');
    }

    return subscription;
  }

  async getInvoices(organizationId: string) {
    return this.prisma.subscriptionInvoice.findMany({
      where: {
        subscription: { organizationId },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: {
          include: { plan: true },
        },
        payments: true,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // USAGE TRACKING & ENFORCEMENT
  // ---------------------------------------------------------------------------

  async trackUsage(organizationId: string, dto: TrackUsageDto) {
    const sub = await this.prisma.organizationSubscription.findFirst({
      where: { organizationId, status: 'Active' },
      include: {
        plan: {
          include: { resourceLimits: true },
        },
      },
    });

    if (!sub) {
      throw new BadRequestException('No active subscription found to track usage');
    }

    const limit = sub.plan.resourceLimits.find((r) => r.resourceKey === dto.featureName);
    if (!limit) {
      throw new BadRequestException(`Resource '${dto.featureName}' is not defined in the current subscription plan`);
    }
    if (limit.limitType === 'DISABLED') {
      throw new BadRequestException(`Resource '${dto.featureName}' is disabled on the current subscription plan`);
    }

    const incrementVal = dto.incrementValue || 1;

    // Get current usage
    let usage = await this.prisma.subscriptionUsage.findFirst({
      where: { subscriptionId: sub.id, featureName: dto.featureName },
    });

    const currentVal = usage ? usage.currentValue : 0;
    const newVal = currentVal + incrementVal;

    if (limit.limitType === 'LIMITED' && limit.limitValue !== null && newVal > limit.limitValue) {
      throw new BadRequestException(
        `Resource limit exceeded for '${dto.featureName}'. Max allowed: ${limit.limitValue}, Current: ${currentVal}, Request: +${incrementVal}`,
      );
    }

    if (usage) {
      return this.prisma.subscriptionUsage.update({
        where: { id: usage.id },
        data: { currentValue: newVal },
      });
    } else {
      return this.prisma.subscriptionUsage.create({
        data: {
          subscriptionId: sub.id,
          featureName: dto.featureName,
          currentValue: newVal,
        },
      });
    }
  }
}
