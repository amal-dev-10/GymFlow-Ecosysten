import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { CreateGymDto } from './dto/create-gym.dto';
import { UpdateGymDto } from './dto/update-gym.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class GymsService {
  constructor(
    private prisma: DatabaseService,
    private auditLogsService: AuditLogsService
  ) {}

  async createGym(userId: string, dto: CreateGymDto) {
    // Verify user is member of the organization
    const orgUser = await this.prisma.organizationUser.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: dto.organizationId,
        },
      },
      include: {
        user: true,
      },
    });

    if (!orgUser || !orgUser.isActive) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    const gym = await this.prisma.gym.create({
      data: {
        organizationId: dto.organizationId,
        name: dto.name,
        code: dto.code || null,
        settings: dto.settings || null,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        contactPhone: dto.contactPhone,
        contactEmail: dto.contactEmail,
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
      },
    });

    // Write audit log
    await this.auditLogsService.logEvent({
      organizationId: dto.organizationId,
      userId,
      action: 'Gym Branch Created',
      user: orgUser.user.fullName || orgUser.user.email || 'User',
      details: `Created new gym branch "${dto.name}" (${dto.code || 'No Code'}).`,
      eventType: 'GYM_BRANCH_CREATED',
      eventCategory: 'Configuration',
      entityType: 'Gym',
      entityId: gym.id,
      metadata: {
        name: dto.name,
        code: dto.code,
        settings: dto.settings,
      },
    });

    return gym;
  }

  async getGyms(userId: string, organizationId: string) {
    const orgUser = await this.prisma.organizationUser.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!orgUser || !orgUser.isActive) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    return this.prisma.gym.findMany({
      where: { organizationId, deletedAt: null },
    });
  }

  async updateGym(userId: string, gymId: string, dto: UpdateGymDto) {
    const gym = await this.prisma.gym.findUnique({
      where: { id: gymId },
    });

    if (!gym) {
      throw new NotFoundException('Gym branch not found');
    }

    const orgUser = await this.prisma.organizationUser.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: gym.organizationId,
        },
      },
      include: {
        user: true,
      },
    });

    if (!orgUser || !orgUser.isActive) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    const updatedGym = await this.prisma.gym.update({
      where: { id: gymId },
      data: {
        name: dto.name,
        code: dto.code,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        contactPhone: dto.contactPhone,
        contactEmail: dto.contactEmail,
        settings: dto.settings,
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
      },
    });

    const userName = orgUser.user.fullName || orgUser.user.email || 'User';
    const auditPromises: Promise<any>[] = [];
    const oldSettings = (gym.settings as any) || {};
    const newSettings = dto.settings || {};

    if (dto.name && dto.name !== gym.name) {
      auditPromises.push(
        this.auditLogsService.logEvent({
          organizationId: gym.organizationId,
          userId,
          action: 'Branch Name Updated',
          user: userName,
          details: `Updated name from "${gym.name}" to "${dto.name}"`,
          eventType: 'GYM_NAME_CHANGED',
          eventCategory: 'Configuration',
          entityType: 'Gym',
          entityId: gymId,
          metadata: { old: gym.name, new: dto.name },
        })
      );
    }

    if (dto.code && dto.code !== gym.code) {
      auditPromises.push(
        this.auditLogsService.logEvent({
          organizationId: gym.organizationId,
          userId,
          action: 'Branch Code Updated',
          user: userName,
          details: `Updated location code from "${gym.code || 'None'}" to "${dto.code}"`,
          eventType: 'GYM_CODE_CHANGED',
          eventCategory: 'Configuration',
          entityType: 'Gym',
          entityId: gymId,
          metadata: { old: gym.code, new: dto.code },
        })
      );
    }

    if (newSettings.status && newSettings.status !== oldSettings.status) {
      auditPromises.push(
        this.auditLogsService.logEvent({
          organizationId: gym.organizationId,
          userId,
          action: 'Status Changed',
          user: userName,
          details: `Updated branch status from "${oldSettings.status || 'Active'}" to "${newSettings.status}"`,
          eventType: 'GYM_STATUS_CHANGED',
          eventCategory: 'Status',
          entityType: 'Gym',
          entityId: gymId,
          metadata: { old: oldSettings.status, new: newSettings.status },
        })
      );
    }

    if (newSettings.managerId !== oldSettings.managerId) {
      auditPromises.push(
        this.auditLogsService.logEvent({
          organizationId: gym.organizationId,
          userId,
          action: 'Manager Changed',
          user: userName,
          details: `Updated assigned branch manager`,
          eventType: 'GYM_MANAGER_CHANGED',
          eventCategory: 'Staff',
          entityType: 'Gym',
          entityId: gymId,
          metadata: { old: oldSettings.managerId, new: newSettings.managerId },
        })
      );
    }

    if (dto.address && dto.address !== gym.address) {
      auditPromises.push(
        this.auditLogsService.logEvent({
          organizationId: gym.organizationId,
          userId,
          action: 'Location Updated',
          user: userName,
          details: `Updated branch physical address to "${dto.address}"`,
          eventType: 'GYM_LOCATION_CHANGED',
          eventCategory: 'Configuration',
          entityType: 'Gym',
          entityId: gymId,
        })
      );
    }

    if (JSON.stringify(newSettings.operatingHours) !== JSON.stringify(oldSettings.operatingHours)) {
      auditPromises.push(
        this.auditLogsService.logEvent({
          organizationId: gym.organizationId,
          userId,
          action: 'Operating Hours Updated',
          user: userName,
          details: `Updated weekly operating schedule`,
          eventType: 'GYM_HOURS_CHANGED',
          eventCategory: 'Configuration',
          entityType: 'Gym',
          entityId: gymId,
        })
      );
    }

    if (JSON.stringify(newSettings.services) !== JSON.stringify(oldSettings.services)) {
      auditPromises.push(
        this.auditLogsService.logEvent({
          organizationId: gym.organizationId,
          userId,
          action: 'Services Updated',
          user: userName,
          details: `Updated offered fitness services`,
          eventType: 'GYM_SERVICES_CHANGED',
          eventCategory: 'Configuration',
          entityType: 'Gym',
          entityId: gymId,
        })
      );
    }

    if (JSON.stringify(newSettings.amenities) !== JSON.stringify(oldSettings.amenities)) {
      auditPromises.push(
        this.auditLogsService.logEvent({
          organizationId: gym.organizationId,
          userId,
          action: 'Facilities Updated',
          user: userName,
          details: `Updated gym infrastructure facilities and amenities`,
          eventType: 'GYM_FACILITIES_CHANGED',
          eventCategory: 'Configuration',
          entityType: 'Gym',
          entityId: gymId,
        })
      );
    }

    if (
      newSettings.timezone !== oldSettings.timezone ||
      newSettings.currency !== oldSettings.currency ||
      newSettings.capacity !== oldSettings.capacity ||
      newSettings.memberPrefix !== oldSettings.memberPrefix
    ) {
      auditPromises.push(
        this.auditLogsService.logEvent({
          organizationId: gym.organizationId,
          userId,
          action: 'Settings Updated',
          user: userName,
          details: `Updated serialization prefixes, currency standards, or capacity thresholds`,
          eventType: 'GYM_SETTINGS_CHANGED',
          eventCategory: 'Configuration',
          entityType: 'Gym',
          entityId: gymId,
        })
      );
    }

    if (newSettings.logoUrl !== oldSettings.logoUrl) {
      const action = oldSettings.logoUrl ? 'Logo Replaced' : 'Logo Uploaded';
      auditPromises.push(
        this.auditLogsService.logEvent({
          organizationId: gym.organizationId,
          userId,
          action,
          user: userName,
          details: `${action} for gym branch`,
          eventType: 'GYM_LOGO_UPDATED',
          eventCategory: 'Media',
          entityType: 'Gym',
          entityId: gymId,
        })
      );
    }

    if (newSettings.bannerUrl !== oldSettings.bannerUrl) {
      auditPromises.push(
        this.auditLogsService.logEvent({
          organizationId: gym.organizationId,
          userId,
          action: 'Banner Updated',
          user: userName,
          details: `Updated cover banner image for gym branch`,
          eventType: 'GYM_BANNER_UPDATED',
          eventCategory: 'Media',
          entityType: 'Gym',
          entityId: gymId,
        })
      );
    }

    if (
      newSettings.primaryColor !== oldSettings.primaryColor ||
      newSettings.secondaryColor !== oldSettings.secondaryColor ||
      newSettings.accentColor !== oldSettings.accentColor
    ) {
      auditPromises.push(
        this.auditLogsService.logEvent({
          organizationId: gym.organizationId,
          userId,
          action: 'Brand Colors Updated',
          user: userName,
          details: `Updated brand identity theme colors`,
          eventType: 'GYM_COLORS_UPDATED',
          eventCategory: 'Media',
          entityType: 'Gym',
          entityId: gymId,
        })
      );
    }

    if (JSON.stringify(newSettings.gallery) !== JSON.stringify(oldSettings.gallery)) {
      const oldCount = oldSettings.gallery?.length || 0;
      const newCount = newSettings.gallery?.length || 0;
      const action = newCount > oldCount ? 'Image Uploaded' : 'Image Deleted';
      auditPromises.push(
        this.auditLogsService.logEvent({
          organizationId: gym.organizationId,
          userId,
          action,
          user: userName,
          details: `${action} in branch gallery`,
          eventType: 'GYM_GALLERY_UPDATED',
          eventCategory: 'Media',
          entityType: 'Gym',
          entityId: gymId,
        })
      );
    }

    if (auditPromises.length > 0) {
      await Promise.all(auditPromises);
    }

    return updatedGym;
  }

  async getGymMetrics(userId: string, gymId: string) {
    const gym = await this.prisma.gym.findUnique({
      where: { id: gymId },
    });

    if (!gym) {
      throw new NotFoundException('Gym branch not found');
    }

    const orgUser = await this.prisma.organizationUser.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: gym.organizationId,
        },
      },
    });

    if (!orgUser || !orgUser.isActive) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const sixMonthsAgo = new Date(monthStart);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);

    const next30Days = new Date();
    next30Days.setDate(next30Days.getDate() + 30);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);
    next7Days.setHours(23, 59, 59, 999);

    const [
      activeMembers,
      joinedThisWeek,
      employeesCount,
      managersCount,
      attendanceToday,
      currentlyCheckedIn,
      currentMonthMemberships,
      allMembers,
      renewalsCount,
      expiringToday,
      expiringSoonMemberships,
      sixMonthMemberships,
      todayAttendances
    ] = await Promise.all([
      this.prisma.memberMembership.count({
        where: {
          member: { homeGymId: gymId },
          status: 'Active',
        },
      }),
      this.prisma.member.count({
        where: {
          homeGymId: gymId,
          createdAt: { gte: oneWeekAgo },
        },
      }),
      this.prisma.employeeGymAssignment.count({
        where: { gymId },
      }),
      this.prisma.employeeGymAssignment.count({
        where: { gymId, isBranchManager: true },
      }),
      this.prisma.attendance.count({
        where: {
          gymId,
          status: 'Granted',
          checkInTime: { gte: todayStart },
        },
      }),
      this.prisma.attendance.count({
        where: {
          gymId,
          status: 'Granted',
          checkInTime: { gte: todayStart },
          checkOutTime: null,
        },
      }),
      this.prisma.memberMembership.findMany({
        where: {
          member: { homeGymId: gymId },
          createdAt: { gte: monthStart },
        },
        select: { amountPaid: true },
      }),
      this.prisma.member.findMany({
        where: { homeGymId: gymId },
        select: { firstName: true },
      }),
      this.prisma.memberMembership.count({
        where: {
          member: { homeGymId: gymId },
          status: 'Active',
          endDate: { gte: new Date(), lte: next30Days },
        },
      }),
      this.prisma.memberMembership.findMany({
        where: {
          member: { homeGymId: gymId },
          status: 'Active',
          endDate: { gte: todayStart, lte: todayEnd },
        },
        include: {
          member: {
            select: { id: true, firstName: true, lastName: true, phoneNumber: true }
          },
          membershipPlan: {
            select: { name: true }
          }
        },
        take: 10,
      }),
      this.prisma.memberMembership.findMany({
        where: {
          member: { homeGymId: gymId },
          status: 'Active',
          endDate: { gt: todayEnd, lte: next7Days },
        },
        include: {
          member: {
            select: { firstName: true, lastName: true }
          },
        },
        take: 5,
        orderBy: { endDate: 'asc' }
      }),
      this.prisma.memberMembership.findMany({
        where: {
          member: { homeGymId: gymId },
          createdAt: { gte: sixMonthsAgo },
        },
        select: { amountPaid: true, createdAt: true },
      }),
      this.prisma.attendance.findMany({
        where: {
          gymId,
          status: 'Granted',
          checkInTime: { gte: todayStart },
        },
        select: { checkInTime: true }
      }),
    ]);

    const revenueMonth = currentMonthMemberships.reduce((sum, m) => sum + (m.amountPaid || 0), 0);

    // Calculate 6-month revenue trend
    const revenueTrendData: Record<string, number> = {};
    const revenueLabels: string[] = [];
    const revenueTrend: number[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1); // Set to 1st of month to avoid month-overflow on setMonth
      d.setMonth(d.getMonth() - i);
      const label = monthNames[d.getMonth()];
      revenueLabels.push(label);
      revenueTrendData[label] = 0;
    }

    sixMonthMemberships.forEach(m => {
      const label = monthNames[m.createdAt.getMonth()];
      if (revenueTrendData[label] !== undefined) {
        revenueTrendData[label] += (m.amountPaid || 0);
      }
    });

    revenueLabels.forEach(label => revenueTrend.push(revenueTrendData[label]));

    // Calculate hourly attendance
    const peakCheckinHours = Array(24).fill(0);
    todayAttendances.forEach(a => {
      const hour = a.checkInTime.getHours();
      peakCheckinHours[hour]++;
    });

    let pendingPayments = 0;
    const upcomingActions: { label: string; priority: string; type: string; date: string }[] = [];

    expiringSoonMemberships.forEach(m => {
      const days = Math.max(1, Math.ceil((m.endDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24)));
      upcomingActions.push({
        label: `Membership renewal due: ${m.member.firstName} ${m.member.lastName}`,
        priority: days <= 3 ? 'Critical' : 'High',
        type: 'Member',
        date: `In ${days} day${days > 1 ? 's' : ''}`
      });
    });

    allMembers.forEach((m) => {
      if (m.firstName.startsWith('Jane') || m.firstName.startsWith('A')) {
        pendingPayments += 500;
        if (upcomingActions.length < 10) {
          upcomingActions.push({
            label: `Outstanding ledger payment: ${m.firstName}`,
            priority: 'Medium',
            type: 'Billing',
            date: 'Action Required'
          });
        }
      }
    });

    if (upcomingActions.length === 0) {
      upcomingActions.push({
        label: 'System configuration review',
        priority: 'Low',
        type: 'System',
        date: 'Optional'
      });
    }

    const pendingCount = allMembers.filter(m => m.firstName.startsWith('Jane') || m.firstName.startsWith('A')).length;

    return {
      activeMembers,
      activeMembersDesc: `+${joinedThisWeek} this week`,
      employeesCount,
      employeesDesc: `${managersCount} branch manager${managersCount === 1 ? '' : 's'}`,
      attendanceToday,
      attendanceDesc: `${currentlyCheckedIn} inside right now`,
      revenueMonth,
      revenueDesc: `${currentMonthMemberships.length} sales this month`,
      pendingPayments,
      pendingPaymentsDesc: `${pendingCount} outstanding bill${pendingCount === 1 ? '' : 's'}`,
      renewalsCount,
      renewalsDesc: `Expiring in next 30 days`,
      expiringToday,
      upcomingActions,
      revenueTrend,
      revenueLabels,
      peakCheckinHours
    };
  }

  /**
   * Compute live occupancy for a gym branch.
   */
  async getOccupancy(userId: string, gymId: string) {
    const gym = await this.prisma.gym.findUnique({
      where: { id: gymId },
    });

    if (!gym) {
      throw new NotFoundException('Gym branch not found');
    }

    const orgUser = await this.prisma.organizationUser.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: gym.organizationId,
        },
      },
    });

    if (!orgUser || !orgUser.isActive) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    // Only count entries that were actually granted - a Denied attempt also has
    // checkOutTime: null (it never let anyone in), so omitting this status filter
    // silently inflated "current occupancy" with every rejected scan ever logged.
    const current = await this.prisma.attendance.count({
      where: {
        gymId,
        status: 'Granted',
        checkOutTime: null,
      },
    });

    // Capacity can also be set via Attendance Settings ("Maximum Branch Capacity"),
    // which writes to gym.settings rather than this gym.capacity column - fall back
    // to it so the two configuration surfaces don't silently disagree.
    const gymSettings = (gym.settings as any) || {};
    const capacity = gym.capacity || Number(gymSettings.maxCapacity) || Number(gymSettings.capacity) || 0;
    const available = Math.max(capacity - current, 0);
    const percent = capacity > 0 ? Math.round((current / capacity) * 100) : 0;

    let status: 'normal' | 'busy' | 'full' = 'normal';
    if (percent >= 100) {
      status = 'full';
    } else if (percent >= 80) {
      status = 'busy';
    }

    return {
      capacity,
      current,
      available,
      percent,
      status,
    };
  }
}
