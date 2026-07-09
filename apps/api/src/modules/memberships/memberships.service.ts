import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { CreateMembershipPlanDto, CreateMemberMembershipDto } from './dto/membership.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class MembershipsService {
  constructor(
    private prisma: DatabaseService,
    private auditLogsService: AuditLogsService,
  ) {}

  private async getActorName(userId?: string): Promise<string> {
    if (!userId) return 'System';
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user?.fullName || user?.phoneNumber || 'Staff Member';
  }

  private async isOrgOwner(organizationId: string, userId?: string): Promise<boolean> {
    if (!userId) return false;
    const orgUser = await this.prisma.organizationUser.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      include: { role: true },
    });
    return orgUser?.role?.name === 'Organization Owner';
  }

  async createPlan(organizationId: string, dto: CreateMembershipPlanDto, actorUserId?: string) {
    const plan = await this.prisma.membershipPlan.create({
      data: {
        organizationId,
        name: dto.name,
        code: dto.code,
        description: dto.description || null,
        category: dto.category,
        status: dto.status || 'Draft',
        durationType: dto.durationType,
        durationValue: dto.durationValue,
        basePrice: dto.basePrice,
        joiningFee: dto.joiningFee || 0,
        taxPercentage: dto.taxPercentage || 0,
        branchAccess: dto.branchAccess || 'all',
        benefits: dto.benefits || null,
      },
    });

    const actorName = await this.getActorName(actorUserId);
    await this.auditLogsService.logEvent({
      organizationId,
      userId: actorUserId,
      action: 'Membership Plan Created',
      user: actorName,
      details: `Created membership plan "${plan.name}" (${plan.code}).`,
      eventType: 'MEMBERSHIP_PLAN_CREATED',
      eventCategory: 'Membership',
      entityType: 'MembershipPlan',
      entityId: plan.id,
    });

    return plan;
  }

  async listPlans(organizationId: string) {
    const plans = await this.prisma.membershipPlan.findMany({
      where: { organizationId },
      include: {
        memberMemberships: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return plans.map(plan => {
      const activeMembers = plan.memberMemberships.filter(m => m.status === 'Active').length;
      const totalRevenue = plan.memberMemberships.reduce((sum, m) => sum + m.amountPaid, 0);
      const { memberMemberships, ...rest } = plan;
      return {
        ...rest,
        enrolledCount: activeMembers,
        revenueGenerated: totalRevenue,
      };
    });
  }

  async getPlan(organizationId: string, id: string) {
    const plan = await this.prisma.membershipPlan.findUnique({
      where: { id },
      include: {
        memberMemberships: true,
      },
    });

    if (!plan || plan.organizationId !== organizationId) {
      throw new NotFoundException('Membership Plan not found');
    }

    const activeMembers = plan.memberMemberships.filter(m => m.status === 'Active').length;
    const totalRevenue = plan.memberMemberships.reduce((sum, m) => sum + m.amountPaid, 0);
    const { memberMemberships, ...rest } = plan;
    return {
      ...rest,
      enrolledCount: activeMembers,
      revenueGenerated: totalRevenue,
    };
  }

  async updatePlan(organizationId: string, id: string, dto: any, actorUserId?: string) {
    const plan = await this.prisma.membershipPlan.findUnique({
      where: { id },
    });

    if (!plan || plan.organizationId !== organizationId) {
      throw new NotFoundException('Membership Plan not found');
    }

    const updated = await this.prisma.membershipPlan.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description !== undefined ? dto.description : undefined,
        category: dto.category,
        status: dto.status,
        durationType: dto.durationType,
        durationValue: dto.durationValue,
        basePrice: dto.basePrice,
        joiningFee: dto.joiningFee,
        taxPercentage: dto.taxPercentage,
        branchAccess: dto.branchAccess,
        benefits: dto.benefits !== undefined ? dto.benefits : undefined,
      },
    });

    const actorName = await this.getActorName(actorUserId);
    await this.auditLogsService.logEvent({
      organizationId,
      userId: actorUserId,
      action: 'Membership Plan Updated',
      user: actorName,
      details: `Updated membership plan "${updated.name}" (${updated.code}).`,
      eventType: 'MEMBERSHIP_PLAN_UPDATED',
      eventCategory: 'Membership',
      entityType: 'MembershipPlan',
      entityId: updated.id,
    });

    return updated;
  }

  async purchaseMembership(organizationId: string, dto: CreateMemberMembershipDto, actorUserId?: string) {
    // Verify member exists and belongs to organization
    const member = await this.prisma.member.findUnique({
      where: { id: dto.memberId },
    });

    if (!member || member.organizationId !== organizationId) {
      throw new NotFoundException('Member not found in this organization');
    }

    // Verify plan exists and belongs to organization
    const plan = await this.prisma.membershipPlan.findUnique({
      where: { id: dto.membershipPlanId },
    });

    if (!plan || plan.organizationId !== organizationId) {
      throw new NotFoundException('Membership Plan not found');
    }

    // Create the purchase
    const purchase = await this.prisma.memberMembership.create({
      data: {
        memberId: dto.memberId,
        membershipPlanId: dto.membershipPlanId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        status: dto.status || 'Active',
        amountPaid: dto.amountPaid,
      },
      include: {
        membershipPlan: true,
      },
    });

    // Update the member's aiInsights to include this purchased membership in membershipsList
    const ai = member.aiInsights as any || {};
    const membershipsList = ai.membershipsList || [];
    const updatedMemberships = [
      {
        id: purchase.id,
        plan: plan.name,
        start: dto.startDate,
        end: dto.endDate,
        status: purchase.status,
        amount: dto.amountPaid,
      },
      ...membershipsList,
    ];

    const actorName = await this.getActorName(actorUserId);

    const timelineEvents = ai.timelineEvents || [];
    const updatedTimeline = [
      {
        id: 't-purch-' + Date.now(),
        type: 'Membership Purchased',
        timestamp: new Date().toLocaleString(),
        user: actorName,
      },
      ...timelineEvents,
    ];

    await this.prisma.member.update({
      where: { id: dto.memberId },
      data: {
        aiInsights: {
          ...ai,
          status: 'Active',
          membershipsList: updatedMemberships,
          timelineEvents: updatedTimeline,
        },
      },
    });

    await this.auditLogsService.logEvent({
      organizationId,
      userId: actorUserId,
      action: 'Membership Purchased',
      user: actorName,
      details: `Purchased "${plan.name}" for ${member.firstName} ${member.lastName}. Amount: ${dto.amountPaid}.`,
      eventType: 'MEMBERSHIP_PURCHASED',
      eventCategory: 'Membership',
      entityType: 'MemberMembership',
      entityId: purchase.id,
    });

    return purchase;
  }

  async listPurchased(organizationId: string, memberId: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member || member.organizationId !== organizationId) {
      throw new NotFoundException('Member not found in this organization');
    }

    return this.prisma.memberMembership.findMany({
      where: { memberId },
      include: {
        membershipPlan: true,
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async getSubscription(organizationId: string, id: string) {
    const subscription = await this.prisma.memberMembership.findUnique({
      where: { id },
      include: {
        membershipPlan: true,
        member: true,
      },
    });

    if (!subscription || subscription.member.organizationId !== organizationId) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  /**
   * Enriched detail payload for the Subscription 360 workspace
   * (/memberships/subscriptions/[id]). Bundles the subscription with its
   * freeze holds, the member's real check-in history, and a real audit-log
   * timeline so the page renders live data instead of hardcoded mocks.
   */
  async getSubscriptionOverview(organizationId: string, id: string) {
    const subscription = await this.prisma.memberMembership.findUnique({
      where: { id },
      include: {
        membershipPlan: true,
        member: { include: { homeGym: true } },
        freezes: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!subscription || subscription.member.organizationId !== organizationId) {
      throw new NotFoundException('Subscription not found');
    }

    // Real check-in history for this member since the subscription started.
    const attendance = await this.prisma.attendance.findMany({
      where: {
        organizationId,
        memberId: subscription.memberId,
        checkInTime: { gte: subscription.startDate },
      },
      include: { gym: true },
      orderBy: { checkInTime: 'desc' },
      take: 100,
    });

    // Visits in the trailing 30 days for the KPI tile.
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const visitsLast30Days = attendance.filter(
      (a) => a.status === 'Granted' && a.checkInTime >= thirtyDaysAgo,
    ).length;

    // Approved/consumed freeze days count against the plan's freeze allowance.
    const freezeDaysUsed = subscription.freezes
      .filter((f) => f.status === 'Approved' || f.status === 'Expired')
      .reduce((sum, f) => sum + f.durationDays, 0);

    // Real timeline: every audited event tied to this membership or its freezes.
    const entityIds = [id, ...subscription.freezes.map((f) => f.id)];
    const timeline = await this.prisma.auditLog.findMany({
      where: { organizationId, entityId: { in: entityIds } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      subscription,
      attendance,
      visitsLast30Days,
      freezes: subscription.freezes,
      freezeDaysUsed,
      timeline,
    };
  }

  async listAllSubscriptions(organizationId: string) {
    return this.prisma.memberMembership.findMany({
      where: {
        member: {
          organizationId,
        },
      },
      include: {
        member: {
          include: {
            homeGym: true,
          },
        },
        membershipPlan: true,
      },
      orderBy: {
        endDate: 'asc',
      },
    });
  }

  async updateSubscription(organizationId: string, id: string, dto: any, actorUserId?: string) {
    const subscription = await this.prisma.memberMembership.findUnique({
      where: { id },
      include: { member: true, membershipPlan: true }
    });
    if (!subscription || subscription.member.organizationId !== organizationId) {
      throw new NotFoundException('Subscription not found');
    }
    const updated = await this.prisma.memberMembership.update({
      where: { id },
      data: dto
    });

    const statusChanged = dto.status !== undefined && dto.status !== subscription.status;
    if (statusChanged) {
      const actorName = await this.getActorName(actorUserId);
      const action = dto.status === 'Cancelled' ? 'Membership Cancelled' : `Membership Status Changed to ${dto.status}`;
      await this.auditLogsService.logEvent({
        organizationId,
        userId: actorUserId,
        action,
        user: actorName,
        details: `${subscription.member.firstName} ${subscription.member.lastName}'s "${subscription.membershipPlan.name}" membership status changed from ${subscription.status} to ${dto.status}.`,
        eventType: dto.status === 'Cancelled' ? 'MEMBERSHIP_CANCELLED' : 'MEMBERSHIP_STATUS_CHANGED',
        eventCategory: 'Membership',
        entityType: 'MemberMembership',
        entityId: updated.id,
      });
    }

    return updated;
  }

  async getExpiring(organizationId: string, gymId: string, days: number) {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const memberWhere: any = {
      organizationId,
    };
    if (gymId && gymId !== 'all') {
      memberWhere.homeGymId = gymId;
    }

    const expiring = await this.prisma.memberMembership.findMany({
      where: {
        member: memberWhere,
        status: 'Active',
        endDate: {
          gte: today,
          lte: futureDate,
        },
      },
      include: {
        member: true,
        membershipPlan: true,
      },
      orderBy: {
        endDate: 'asc',
      },
    });

    return expiring.map(sub => {
      const daysUntilExpiry = Math.max(0, Math.ceil((sub.endDate.getTime() - today.getTime()) / (1000 * 3600 * 24)));
      return {
        ...sub,
        daysUntilExpiry,
      };
    });
  }

  // --- Freeze Management ---

  async listFreezes(organizationId: string) {
    return this.prisma.membershipFreeze.findMany({
      where: {
        memberMembership: {
          member: {
            organizationId
          }
        }
      },
      include: {
        memberMembership: {
          include: {
            member: true,
            membershipPlan: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async requestFreeze(organizationId: string, dto: any, actorUserId?: string) {
    const { memberMembershipId, startDate, endDate, durationDays, reasonCategory, reasonNotes, documentUrl } = dto;

    const sub = await this.prisma.memberMembership.findUnique({
      where: { id: memberMembershipId },
      include: { member: true }
    });

    if (!sub || sub.member.organizationId !== organizationId) {
      throw new NotFoundException('Subscription not found');
    }

    const actorName = await this.getActorName(actorUserId);
    const autoApprove = await this.isOrgOwner(organizationId, actorUserId);

    let freeze;
    if (autoApprove) {
      const newEnd = new Date(sub.endDate.getTime() + (durationDays * 24 * 60 * 60 * 1000));
      freeze = await this.prisma.$transaction(async (tx) => {
        await tx.memberMembership.update({
          where: { id: memberMembershipId },
          data: { endDate: newEnd, status: 'Frozen' }
        });

        return tx.membershipFreeze.create({
          data: {
            memberMembershipId,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            durationDays,
            reasonCategory,
            reasonNotes,
            documentUrl,
            status: 'Approved',
            approvedBy: actorName
          }
        });
      });
    } else {
      freeze = await this.prisma.membershipFreeze.create({
        data: {
          memberMembershipId,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          durationDays,
          reasonCategory,
          reasonNotes,
          documentUrl,
          status: 'Pending Approval'
        }
      });
    }

    await this.auditLogsService.logEvent({
      organizationId,
      userId: actorUserId,
      action: autoApprove ? 'Membership Freeze Auto-Approved' : 'Membership Freeze Requested',
      user: actorName,
      details: autoApprove
        ? `Owner-initiated ${durationDays}-day freeze for ${sub.member.firstName} ${sub.member.lastName} was auto-approved. Reason: ${reasonCategory}.`
        : `Requested a ${durationDays}-day freeze for ${sub.member.firstName} ${sub.member.lastName}. Reason: ${reasonCategory}.`,
      eventType: autoApprove ? 'MEMBERSHIP_FREEZE_APPROVED' : 'MEMBERSHIP_FREEZE_REQUESTED',
      eventCategory: 'Membership',
      entityType: 'MembershipFreeze',
      entityId: freeze.id,
    });

    return freeze;
  }

  async approveFreeze(organizationId: string, id: string, approvedBy?: string) {
    const freeze = await this.prisma.membershipFreeze.findUnique({
      where: { id },
      include: {
        memberMembership: {
          include: { member: true }
        }
      }
    });

    if (!freeze || freeze.memberMembership.member.organizationId !== organizationId) {
      throw new NotFoundException('Freeze request not found');
    }

    if (freeze.status !== 'Pending Approval') {
      throw new Error('Freeze request is not pending approval');
    }

    // Shift end date
    const currentEnd = freeze.memberMembership.endDate;
    const newEnd = new Date(currentEnd.getTime() + (freeze.durationDays * 24 * 60 * 60 * 1000));

    // Update freeze and membership in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.memberMembership.update({
        where: { id: freeze.memberMembershipId },
        data: { endDate: newEnd, status: 'Frozen' }
      });

      return tx.membershipFreeze.update({
        where: { id },
        data: {
          status: 'Approved',
          approvedBy: approvedBy || 'System'
        }
      });
    });

    await this.auditLogsService.logEvent({
      organizationId,
      action: 'Membership Freeze Approved',
      user: approvedBy || 'System',
      details: `Approved freeze for ${freeze.memberMembership.member.firstName} ${freeze.memberMembership.member.lastName}. Membership extended to ${newEnd.toISOString().split('T')[0]}.`,
      eventType: 'MEMBERSHIP_FREEZE_APPROVED',
      eventCategory: 'Membership',
      entityType: 'MembershipFreeze',
      entityId: id,
    });

    return result;
  }

  async rejectFreeze(organizationId: string, id: string, approvedBy?: string, rejectionReason?: string) {
    const freeze = await this.prisma.membershipFreeze.findUnique({
      where: { id },
      include: {
        memberMembership: {
          include: { member: true }
        }
      }
    });

    if (!freeze || freeze.memberMembership.member.organizationId !== organizationId) {
      throw new NotFoundException('Freeze request not found');
    }

    const updated = await this.prisma.membershipFreeze.update({
      where: { id },
      data: {
        status: 'Rejected',
        approvedBy: approvedBy || 'System',
        rejectionReason
      }
    });

    await this.auditLogsService.logEvent({
      organizationId,
      action: 'Membership Freeze Rejected',
      user: approvedBy || 'System',
      details: `Rejected freeze request for ${freeze.memberMembership.member.firstName} ${freeze.memberMembership.member.lastName}. Reason: ${rejectionReason || 'Not specified'}.`,
      eventType: 'MEMBERSHIP_FREEZE_REJECTED',
      eventCategory: 'Membership',
      entityType: 'MembershipFreeze',
      entityId: id,
    });

    return updated;
  }

  async reactivateEarly(organizationId: string, id: string, actorUserId?: string) {
    const freeze = await this.prisma.membershipFreeze.findUnique({
      where: { id },
      include: {
        memberMembership: {
          include: { member: true }
        }
      }
    });

    if (!freeze || freeze.memberMembership.member.organizationId !== organizationId) {
      throw new NotFoundException('Freeze request not found');
    }

    if (freeze.status !== 'Approved') {
      throw new Error('Only approved freezes can be reactivated early');
    }

    // Calculate unused days (from today to freeze endDate)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const freezeEnd = new Date(freeze.endDate);
    freezeEnd.setHours(0, 0, 0, 0);

    let daysToReduce = 0;
    if (freezeEnd > today) {
      daysToReduce = Math.round((freezeEnd.getTime() - today.getTime()) / (1000 * 3600 * 24));
    }

    // Reduce membership endDate by unused days
    const currentSubEnd = freeze.memberMembership.endDate;
    const newSubEnd = new Date(currentSubEnd.getTime() - (daysToReduce * 24 * 60 * 60 * 1000));

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.memberMembership.update({
        where: { id: freeze.memberMembershipId },
        data: { endDate: newSubEnd, status: newSubEnd > today ? 'Active' : 'Expired' }
      });

      return tx.membershipFreeze.update({
        where: { id },
        data: {
          status: 'Expired',
          endDate: today // set freeze end to today
        }
      });
    });

    const actorName = await this.getActorName(actorUserId);
    await this.auditLogsService.logEvent({
      organizationId,
      userId: actorUserId,
      action: 'Membership Reactivated Early',
      user: actorName,
      details: `Reactivated ${freeze.memberMembership.member.firstName} ${freeze.memberMembership.member.lastName}'s membership early, ending the freeze ${daysToReduce} day(s) ahead of schedule.`,
      eventType: 'MEMBERSHIP_REACTIVATED_EARLY',
      eventCategory: 'Membership',
      entityType: 'MembershipFreeze',
      entityId: id,
    });

    return result;
  }
}
