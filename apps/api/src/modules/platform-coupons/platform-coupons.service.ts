import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateCouponDto, UpdateCouponDto } from './dto/coupon.dto';

const AUDIT_CATEGORY = 'Commercial';

@Injectable()
export class PlatformCouponsService {
  constructor(
    private prisma: DatabaseService,
    private auditLogsService: AuditLogsService,
  ) {}

  async list() {
    const coupons = await this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: { redemptions: { where: { removedAt: null }, select: { id: true, organizationId: true, discountApplied: true, redeemedAt: true } } },
    });
    const planIds = Array.from(new Set(coupons.flatMap((c) => c.applicablePlanIds)));
    const plans = planIds.length ? await this.prisma.subscriptionPlan.findMany({ where: { id: { in: planIds } }, select: { id: true, name: true } }) : [];
    const planMap = new Map(plans.map((p) => [p.id, p.name]));

    return coupons.map((c) => ({
      ...c,
      applicablePlans: c.applicablePlanIds.map((id) => ({ id, name: planMap.get(id) || 'Unknown plan' })),
      activeRedemptions: c.redemptions.length,
      totalDiscountApplied: Math.round(c.redemptions.reduce((sum, r) => sum + r.discountApplied, 0) * 100) / 100,
    }));
  }

  async getStats() {
    const coupons = await this.prisma.coupon.findMany({ include: { redemptions: { where: { removedAt: null } } } });
    const now = new Date();
    return {
      total: coupons.length,
      active: coupons.filter((c) => c.isActive && (!c.validUntil || new Date(c.validUntil) >= now)).length,
      expired: coupons.filter((c) => c.validUntil && new Date(c.validUntil) < now).length,
      totalRedemptions: coupons.reduce((sum, c) => sum + c.redemptions.length, 0),
      totalDiscountGiven: Math.round(coupons.reduce((sum, c) => sum + c.redemptions.reduce((s, r) => s + r.discountApplied, 0), 0) * 100) / 100,
    };
  }

  async create(dto: CreateCouponDto, actorUserId: string) {
    const existing = await this.prisma.coupon.findUnique({ where: { code: dto.code.toUpperCase() } });
    if (existing) throw new BadRequestException(`Coupon code "${dto.code}" already exists.`);
    if (dto.discountType === 'FIXED' && !dto.currency) throw new BadRequestException('currency is required for a FIXED discount.');
    if (dto.discountType === 'PERCENTAGE' && dto.discountValue > 100) throw new BadRequestException('Percentage discount cannot exceed 100.');

    const coupon = await this.prisma.coupon.create({
      data: {
        code: dto.code.toUpperCase(),
        description: dto.description,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        currency: dto.discountType === 'FIXED' ? dto.currency : null,
        maxRedemptions: dto.maxRedemptions,
        stackable: dto.stackable ?? false,
        applicablePlanIds: dto.applicablePlanIds ?? [],
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      },
    });

    await this.logEvent(actorUserId, 'Coupon Created', `Created coupon "${coupon.code}".`, coupon.id);
    return coupon;
  }

  async update(id: string, dto: UpdateCouponDto, actorUserId: string) {
    const coupon = await this.assertExists(id);
    const updated = await this.prisma.coupon.update({
      where: { id },
      data: {
        description: dto.description,
        stackable: dto.stackable,
        applicablePlanIds: dto.applicablePlanIds,
        validUntil: dto.validUntil !== undefined ? (dto.validUntil ? new Date(dto.validUntil) : null) : undefined,
        maxRedemptions: dto.maxRedemptions,
        isActive: dto.isActive,
      },
    });
    const action = dto.isActive === false && coupon.isActive ? 'Coupon Deactivated' : dto.isActive === true && !coupon.isActive ? 'Coupon Reactivated' : 'Coupon Updated';
    await this.logEvent(actorUserId, action, `${action.replace('Coupon ', '')} coupon "${coupon.code}".`, id);
    return updated;
  }

  async remove(id: string, actorUserId: string) {
    const coupon = await this.assertExists(id);
    const activeRedemptions = await this.prisma.couponRedemption.count({ where: { couponId: id, removedAt: null } });
    if (activeRedemptions > 0) {
      throw new BadRequestException(`Cannot delete "${coupon.code}" — it is currently applied to ${activeRedemptions} organization(s). Deactivate it instead.`);
    }
    await this.prisma.coupon.delete({ where: { id } });
    await this.logEvent(actorUserId, 'Coupon Deleted', `Deleted unused coupon "${coupon.code}".`, id);
    return { ok: true };
  }

  // Used by the org-level Subscription tab's "Apply Coupon" action.
  async validateForSubscription(code: string, planId: string, organizationId: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon) throw new NotFoundException('Coupon code not found.');
    if (!coupon.isActive) throw new BadRequestException('This coupon is no longer active.');
    if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) throw new BadRequestException('This coupon has expired.');
    if (coupon.maxRedemptions != null && coupon.redemptionCount >= coupon.maxRedemptions) throw new BadRequestException('This coupon has reached its redemption limit.');
    if (coupon.applicablePlanIds.length > 0 && !coupon.applicablePlanIds.includes(planId)) throw new BadRequestException('This coupon is not valid for the organization\'s current plan.');

    if (!coupon.stackable) {
      const activeForOrg = await this.prisma.couponRedemption.findFirst({ where: { organizationId, removedAt: null } });
      if (activeForOrg) throw new BadRequestException('This organization already has a non-stackable coupon applied. Remove it first.');
    }
    return coupon;
  }

  private async assertExists(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  private async getActorName(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user?.fullName || 'Platform Admin';
  }

  private async logEvent(actorUserId: string, action: string, details: string, entityId: string) {
    const actorName = await this.getActorName(actorUserId);
    await this.auditLogsService.logEvent({
      organizationId: null,
      userId: actorUserId,
      action,
      user: actorName,
      details,
      eventType: action.toUpperCase().replace(/\s+/g, '_'),
      eventCategory: AUDIT_CATEGORY,
      entityType: 'Coupon',
      entityId,
    });
  }
}
