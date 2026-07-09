import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { CreateLeadSourceDto } from './dto/create-lead-source.dto';
import { CreateLeadStatusDto } from './dto/create-lead-status.dto';
import { CreateLeadActivityDto } from './dto/create-lead-activity.dto';
import { AssignLeadDto } from './dto/assign-lead.dto';

@Injectable()
export class LeadsService {
  constructor(private prisma: DatabaseService) {}

  // ---------------------------------------------------------------------------
  // LEAD SOURCES
  // ---------------------------------------------------------------------------

  async createLeadSource(organizationId: string, dto: CreateLeadSourceDto) {
    return this.prisma.leadSource.create({
      data: {
        organizationId,
        name: dto.name,
      },
    });
  }

  async getLeadSources(organizationId: string) {
    return this.prisma.leadSource.findMany({
      where: { organizationId },
    });
  }

  // ---------------------------------------------------------------------------
  // LEAD STATUSES
  // ---------------------------------------------------------------------------

  async createLeadStatus(organizationId: string, dto: CreateLeadStatusDto) {
    return this.prisma.leadStatus.create({
      data: {
        organizationId,
        name: dto.name,
        isSystem: dto.isSystem || false,
      },
    });
  }

  async getLeadStatuses(organizationId: string) {
    return this.prisma.leadStatus.findMany({
      where: { organizationId },
    });
  }

  // ---------------------------------------------------------------------------
  // LEADS
  // ---------------------------------------------------------------------------

  async createLead(organizationId: string, dto: CreateLeadDto) {
    // Validate Gym belongs to organization
    const gym = await this.prisma.gym.findUnique({
      where: { id: dto.gymId },
    });
    if (!gym || gym.organizationId !== organizationId) {
      throw new NotFoundException('Gym not found in this organization');
    }

    // Validate Lead Source belongs to organization
    const source = await this.prisma.leadSource.findUnique({
      where: { id: dto.sourceId },
    });
    if (!source || source.organizationId !== organizationId) {
      throw new NotFoundException('Lead source not found in this organization');
    }

    // Validate Lead Status belongs to organization
    const status = await this.prisma.leadStatus.findUnique({
      where: { id: dto.statusId },
    });
    if (!status || status.organizationId !== organizationId) {
      throw new NotFoundException('Lead status not found in this organization');
    }

    return this.prisma.lead.create({
      data: {
        organizationId,
        gymId: dto.gymId,
        sourceId: dto.sourceId,
        statusId: dto.statusId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phoneNumber: dto.phoneNumber,
        aiScore: dto.aiScore,
      },
      include: {
        source: true,
        status: true,
        gym: true,
      },
    });
  }

  async getLeads(
    organizationId: string,
    filters: { gymId?: string; statusId?: string; sourceId?: string }
  ) {
    return this.prisma.lead.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(filters.gymId && { gymId: filters.gymId }),
        ...(filters.statusId && { statusId: filters.statusId }),
        ...(filters.sourceId && { sourceId: filters.sourceId }),
      },
      include: {
        source: true,
        status: true,
        gym: true,
        assignments: {
          include: {
            employee: {
              include: {
                user: {
                  select: {
                    fullName: true,
                    phoneNumber: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async getLeadById(organizationId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
      include: {
        source: true,
        status: true,
        gym: true,
        assignments: {
          include: {
            employee: {
              include: {
                user: {
                  select: {
                    fullName: true,
                  },
                },
              },
            },
          },
        },
        activities: {
          orderBy: { activityDate: 'desc' },
          include: {
            employee: {
              include: {
                user: {
                  select: {
                    fullName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return lead;
  }

  // ---------------------------------------------------------------------------
  // ASSIGNMENTS & ACTIVITIES
  // ---------------------------------------------------------------------------

  async assignLead(organizationId: string, leadId: string, dto: AssignLeadDto) {
    // Verify lead
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, organizationId, deletedAt: null },
    });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    // Verify employee
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, organizationId, deletedAt: null },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found in this organization');
    }

    return this.prisma.leadAssignment.create({
      data: {
        leadId,
        employeeId: dto.employeeId,
      },
    });
  }

  async createLeadActivity(organizationId: string, leadId: string, dto: CreateLeadActivityDto) {
    // Verify lead
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, organizationId, deletedAt: null },
    });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    // Verify employee
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, organizationId, deletedAt: null },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found in this organization');
    }

    return this.prisma.leadActivity.create({
      data: {
        leadId,
        employeeId: dto.employeeId,
        activityType: dto.activityType,
        notes: dto.notes,
        activityDate: dto.activityDate ? new Date(dto.activityDate) : new Date(),
      },
    });
  }

  async getLeadActivities(organizationId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, organizationId, deletedAt: null },
    });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return this.prisma.leadActivity.findMany({
      where: { leadId },
      orderBy: { activityDate: 'desc' },
      include: {
        employee: {
          include: {
            user: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
    });
  }
}
