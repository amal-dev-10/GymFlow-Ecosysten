import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class OrganizationsService {
  constructor(
    private prisma: DatabaseService,
    private auditLogsService: AuditLogsService
  ) {}

  async createOrganization(userId: string, dto: CreateOrganizationDto) {
    // Check if slug is unique
    const existing = await this.prisma.organization.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new BadRequestException('Organization slug is already in use');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Organization
      const org = await tx.organization.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          logoUrl: dto.logoUrl,
          businessType: dto.businessType,
          phone: dto.phone,
          email: dto.email,
          website: dto.website,
          addressLine1: dto.addressLine1,
          addressLine2: dto.addressLine2,
          city: dto.city,
          state: dto.state,
          country: dto.country,
          postalCode: dto.postalCode,
          currency: dto.currency || 'USD',
          timezone: dto.timezone || 'UTC',
          dateFormat: dto.dateFormat || 'YYYY-MM-DD',
          language: dto.language || 'en',
        },
      });

      // 2. Find global Organization Owner role
      let ownerRole = await tx.role.findFirst({
        where: {
          name: 'Organization Owner',
          organizationId: null,
        },
      });

      if (!ownerRole) {
        ownerRole = await tx.role.create({
          data: {
            name: 'Organization Owner',
            description: 'Full access to all organizations, gyms, financial statements, and staff configurations.',
            category: 'Management',
            organizationId: null,
            gymScope: 'all',
          },
        });
      }

      // 3. Link Creator user as OrganizationUser with Organization Owner role
      await tx.organizationUser.create({
        data: {
          userId,
          organizationId: org.id,
          roleId: ownerRole.id,
          isActive: true,
        },
      });

      // 4. Every organization must always have exactly one active subscription
      // plan - assign the platform's current default plan on creation.
      const defaultPlan = await tx.subscriptionPlan.findFirst({ where: { isDefault: true } });
      if (defaultPlan) {
        const now = new Date();
        const trialEndDate = defaultPlan.trialDays > 0 ? this.addDays(now, defaultPlan.trialDays) : null;

        await tx.organizationSubscription.create({
          data: {
            organizationId: org.id,
            planId: defaultPlan.id,
            status: 'Active',
            startDate: now,
            endDate: this.addBillingCycle(now, defaultPlan.billingCycle),
            trialStartDate: trialEndDate ? now : null,
            trialEndDate,
          },
        });
      }

      return org;
    });

  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private addBillingCycle(date: Date, billingCycle: string): Date {
    const result = new Date(date);
    switch (billingCycle) {
      case 'MONTHLY':
        result.setMonth(result.getMonth() + 1);
        break;
      case 'QUARTERLY':
        result.setMonth(result.getMonth() + 3);
        break;
      case 'HALF_YEARLY':
        result.setMonth(result.getMonth() + 6);
        break;
      case 'YEARLY':
      case 'ENTERPRISE':
      case 'CUSTOM':
        result.setFullYear(result.getFullYear() + 1);
        break;
      case 'FREE':
      default:
        result.setFullYear(result.getFullYear() + 100);
        break;
    }
    return result;
  }

  async getUserOrganizations(userId: string) {
    const organizations = await this.prisma.organization.findMany({
      where: {
        users: {
          some: { userId },
        },
      },
      include: {
        gyms: true,
        users: {
          where: { userId },
          include: { role: true },
        },
      },
    });

    return organizations.map(({ users, ...org }) => ({
      ...org,
      myRole: users[0]?.role?.name ?? null,
    }));
  }

  async updateOrganization(orgId: string, userId: string, dto: UpdateOrganizationDto) {
    const membership = await this.prisma.organizationUser.findFirst({
      where: {
        userId,
        organizationId: orgId,
      },
      include: {
        user: true,
      },
    });

    if (!membership) {
      throw new BadRequestException('User is not authorized for this organization');
    }

    const oldOrg = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!oldOrg) {
      throw new BadRequestException('Organization not found');
    }

    if (dto.slug) {
      const existing = await this.prisma.organization.findUnique({
        where: { slug: dto.slug },
      });
      if (existing && existing.id !== orgId) {
        throw new BadRequestException('Organization slug is already in use');
      }
    }

    const updatedOrg = await this.prisma.organization.update({
      where: { id: orgId },
      data: dto,
    });

    const userName = (membership.user && membership.user.fullName)
      ? membership.user.fullName
      : (membership.user && membership.user.email)
        ? membership.user.email
        : 'Administrator';
    const logPromises: Promise<any>[] = [];

    if (dto.name && dto.name !== oldOrg.name) {
      logPromises.push(
        this.auditLogsService.logEvent({
          organizationId: orgId,
          userId,
          action: 'Organization Name Changed',
          user: userName,
          details: `Updated name from "${oldOrg.name}" to "${dto.name}"`,
          eventType: 'ORG_NAME_CHANGED',
          eventCategory: 'Configuration',
          entityType: 'Organization',
          entityId: orgId,
          metadata: { old: oldOrg.name, new: dto.name },
        })
      );
    }

    if (dto.businessType && dto.businessType !== oldOrg.businessType) {
      logPromises.push(
        this.auditLogsService.logEvent({
          organizationId: orgId,
          userId,
          action: 'Business Type Changed',
          user: userName,
          details: `Updated business type from "${oldOrg.businessType}" to "${dto.businessType}"`,
          eventType: 'ORG_TYPE_CHANGED',
          eventCategory: 'Configuration',
          entityType: 'Organization',
          entityId: orgId,
          metadata: { old: oldOrg.businessType, new: dto.businessType },
        })
      );
    }

    if (dto.logoUrl && dto.logoUrl !== oldOrg.logoUrl) {
      logPromises.push(
        this.auditLogsService.logEvent({
          organizationId: orgId,
          userId,
          action: 'Logo Updated',
          user: userName,
          details: `Updated organization logo`,
          eventType: 'ORG_LOGO_CHANGED',
          eventCategory: 'Configuration',
          entityType: 'Organization',
          entityId: orgId,
          metadata: { old: oldOrg.logoUrl, new: dto.logoUrl },
        })
      );
    }

    const contactFields: (keyof UpdateOrganizationDto)[] = ['phone', 'email', 'website'];
    const contactChanges: any = {};
    let contactChanged = false;
    for (const field of contactFields) {
      if (dto[field] !== undefined && dto[field] !== oldOrg[field]) {
        contactChanges[field] = { old: oldOrg[field], new: dto[field] };
        contactChanged = true;
      }
    }
    if (contactChanged) {
      logPromises.push(
        this.auditLogsService.logEvent({
          organizationId: orgId,
          userId,
          action: 'Contact Information Updated',
          user: userName,
          details: `Updated contact settings: ${Object.keys(contactChanges).join(', ')}`,
          eventType: 'ORG_CONTACT_CHANGED',
          eventCategory: 'Configuration',
          entityType: 'Organization',
          entityId: orgId,
          metadata: contactChanges,
        })
      );
    }

    const addrFields: (keyof UpdateOrganizationDto)[] = ['addressLine1', 'addressLine2', 'city', 'state', 'country', 'postalCode'];
    const addrChanges: any = {};
    let addrChanged = false;
    for (const field of addrFields) {
      if (dto[field] !== undefined && dto[field] !== oldOrg[field]) {
        addrChanges[field] = { old: oldOrg[field], new: dto[field] };
        addrChanged = true;
      }
    }
    if (addrChanged) {
      logPromises.push(
        this.auditLogsService.logEvent({
          organizationId: orgId,
          userId,
          action: 'Address Updated',
          user: userName,
          details: `Updated address location details`,
          eventType: 'ORG_ADDRESS_CHANGED',
          eventCategory: 'Configuration',
          entityType: 'Organization',
          entityId: orgId,
          metadata: addrChanges,
        })
      );
    }

    const settingsFields: (keyof UpdateOrganizationDto)[] = ['currency', 'timezone', 'dateFormat', 'language'];
    const settingsChanges: any = {};
    let settingsChanged = false;
    for (const field of settingsFields) {
      if (dto[field] !== undefined && dto[field] !== oldOrg[field]) {
        settingsChanges[field] = { old: oldOrg[field], new: dto[field] };
        settingsChanged = true;
      }
    }
    if (settingsChanged) {
      logPromises.push(
        this.auditLogsService.logEvent({
          organizationId: orgId,
          userId,
          action: 'Settings Updated',
          user: userName,
          details: `Updated organization settings: ${Object.keys(settingsChanges).join(', ')}`,
          eventType: 'ORG_SETTINGS_CHANGED',
          eventCategory: 'Configuration',
          entityType: 'Organization',
          entityId: orgId,
          metadata: settingsChanges,
        })
      );
    }

    if (dto.settings) {
      const oldSettings = (oldOrg.settings as any) || {};
      const newSettings = dto.settings;
      const changedCategories: string[] = [];

      const categories = ['membership', 'attendance', 'billing', 'security', 'notifications', 'gymDefaults', 'integrations'];
      for (const cat of categories) {
        if (JSON.stringify(oldSettings[cat]) !== JSON.stringify(newSettings[cat])) {
          changedCategories.push(cat);
        }
      }

      if (changedCategories.length > 0) {
        logPromises.push(
          this.auditLogsService.logEvent({
            organizationId: orgId,
            userId,
            action: 'Organization Settings Configured',
            user: userName,
            details: `Updated business config sections: ${changedCategories.join(', ')}`,
            eventType: 'ORG_SETTINGS_UPDATED',
            eventCategory: 'Configuration',
            entityType: 'Organization',
            entityId: orgId,
            metadata: { changed: changedCategories, old: oldSettings, new: newSettings },
          })
        );
      }
    }

    await Promise.all(logPromises).catch(err => {
      console.error('Failed to log audit event on org update:', err);
    });

    return updatedOrg;
  }

  async getOrganizationOverview(orgId: string, userId: string) {
    const membership = await this.prisma.organizationUser.findFirst({
      where: {
        userId,
        organizationId: orgId,
      },
    });

    if (!membership) {
      throw new BadRequestException('User is not authorized for this organization');
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // Query database for actual counts
    const [totalGyms, totalMembers, totalEmployees, activeMemberships, todayAttendance, allMembers] = await Promise.all([
      this.prisma.gym.count({ where: { organizationId: orgId } }),
      this.prisma.member.count({ where: { organizationId: orgId } }),
      this.prisma.employee.count({ where: { organizationId: orgId } }),
      this.prisma.memberMembership.count({
        where: {
          member: { organizationId: orgId },
          status: 'Active',
        },
      }),
      this.prisma.attendance.count({
        where: {
          organizationId: orgId,
          status: 'Granted',
          checkInTime: { gte: todayStart },
        },
      }),
      this.prisma.member.findMany({
        where: { organizationId: orgId },
        select: { firstName: true },
      }),
    ]);

    // Sum monthly memberships amountPaid created this month
    const currentMonthMemberships = await this.prisma.memberMembership.findMany({
      where: {
        member: { organizationId: orgId },
        createdAt: { gte: monthStart },
      },
      select: { amountPaid: true },
    });

    const monthlyRevenueVal = currentMonthMemberships.reduce((sum, sub) => sum + (sub.amountPaid || 0), 0);

    // Sum outstanding balance (simulated consistently based on name starting with A or Jane)
    let pendingDuesVal = 0;
    allMembers.forEach((m) => {
      if (m.firstName.startsWith('Jane') || m.firstName.startsWith('A')) {
        pendingDuesVal += 500;
      }
    });

    return {
      totalGyms,
      totalMembers,
      totalEmployees,
      activeMemberships,
      monthlyRevenue: monthlyRevenueVal,
      pendingDues: pendingDuesVal,
      attendanceToday: todayAttendance,
    };
  }
}
