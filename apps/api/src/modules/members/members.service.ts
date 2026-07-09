import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateMemberDto, AddMeasurementDto } from './dto/member.dto';
import * as crypto from 'crypto';

@Injectable()
export class MembersService {
  constructor(
    private prisma: DatabaseService,
    private auditLogsService: AuditLogsService,
  ) {}

  private async getActorName(userId?: string): Promise<string> {
    if (!userId) return 'System';
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user?.fullName || user?.phoneNumber || 'Staff Member';
  }

  private resolveActiveMembership(memberMemberships: any[]) {
    return (
      memberMemberships.find((m) => m.status === 'Active') ||
      memberMemberships.find((m) => m.status === 'Frozen') ||
      memberMemberships[0] ||
      null
    );
  }

  async createMember(organizationId: string, dto: CreateMemberDto, actorUserId?: string) {
    // Verify home gym belongs to org
    const gym = await this.prisma.gym.findUnique({
      where: { id: dto.homeGymId },
    });

    if (!gym || gym.organizationId !== organizationId) {
      throw new NotFoundException('Home Gym not found in this organization');
    }

    // 1. Check if member already exists in the current organization
    const existingInOrg = await this.prisma.member.findFirst({
      where: {
        organizationId,
        phoneNumber: dto.phoneNumber,
      },
    });
    if (existingInOrg) {
      return existingInOrg;
    }

    // 2. Check if member exists globally in any other organization —
    // the phone number is the shared "global account" key.
    const globalMember = await this.prisma.member.findFirst({
      where: {
        phoneNumber: dto.phoneNumber,
      },
    });

    // A verified phone (via OTP) carries forward to every gym the person joins.
    const phoneVerification = await this.prisma.phoneVerification.findUnique({
      where: { phoneNumber: dto.phoneNumber },
    });
    const phoneVerified = phoneVerification?.verified || false;

    // Auto-generate member number (MEM-000001 format)
    const count = await this.prisma.member.count({
      where: { organizationId },
    });
    const memberNumber = `MEM-${String(count + 1).padStart(6, '0')}`;

    let created;
    if (globalMember) {
      // Auto-add global member: copy existing profile details
      const parsedDob = globalMember.dob;
      const aiInsights = {
        ...(globalMember.aiInsights as any || {}),
        ...(dto.aiInsights || {}),
        memberNumber,
      };

      created = await this.prisma.member.create({
        data: {
          organizationId,
          homeGymId: dto.homeGymId,
          firstName: globalMember.firstName,
          lastName: globalMember.lastName,
          phoneNumber: dto.phoneNumber,
          dob: parsedDob,
          gender: globalMember.gender,
          aiInsights,
          phoneVerified,
          phoneVerifiedAt: phoneVerified ? new Date() : null,
        },
      });
    } else {
      // 3. Fallback: Create new member profile from scratch
      const parsedDob = dto.dob ? new Date(dto.dob) : null;
      const aiInsights = {
        ...(dto.aiInsights || {}),
        memberNumber,
      };

      created = await this.prisma.member.create({
        data: {
          organizationId,
          homeGymId: dto.homeGymId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phoneNumber: dto.phoneNumber,
          dob: parsedDob,
          gender: dto.gender || null,
          aiInsights,
          phoneVerified,
          phoneVerifiedAt: phoneVerified ? new Date() : null,
        },
      });
    }

    const actorName = await this.getActorName(actorUserId);
    await this.auditLogsService.logEvent({
      organizationId,
      userId: actorUserId,
      action: 'Member Added',
      user: actorName,
      details: globalMember
        ? `Added member ${created.firstName} ${created.lastName} (${created.phoneNumber}) to the organization, linked to their existing global profile.`
        : `Added member ${created.firstName} ${created.lastName} (${created.phoneNumber}) to the organization.`,
      eventType: 'MEMBER_CREATED',
      eventCategory: 'Member',
      entityType: 'Member',
      entityId: created.id,
    });

    return created;
  }

  async listMembers(organizationId: string, homeGymId?: string, search?: string) {
    const where: any = { organizationId };
    if (homeGymId && homeGymId !== 'all') {
      where.homeGymId = homeGymId;
    }
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    const members = await this.prisma.member.findMany({
      where,
      include: {
        homeGym: true,
        memberMeasurements: {
          orderBy: { date: 'desc' },
          take: 1,
        },
        memberDocuments: true,
        memberMemberships: {
          include: {
            membershipPlan: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return members.map((member) => {
      const activeMembership = this.resolveActiveMembership(member.memberMemberships);
      return {
        ...member,
        activeMembership,
      };
    });
  }

  async getMemberDetails(organizationId: string, memberId: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      include: {
        homeGym: true,
        memberMeasurements: {
          orderBy: { date: 'desc' },
        },
        memberDocuments: true,
        attendances: {
          orderBy: { checkInTime: 'desc' },
          include: { gym: true },
        },
        memberMemberships: {
          include: { membershipPlan: true },
          orderBy: { startDate: 'desc' },
        },
      },
    });

    if (!member || member.organizationId !== organizationId) {
      throw new NotFoundException('Member not found in this organization');
    }

    const activeMembership = this.resolveActiveMembership(member.memberMemberships);
    const linkedAccountsCount = await this.prisma.member.count({
      where: { phoneNumber: member.phoneNumber, id: { not: member.id } },
    });

    return {
      ...member,
      activeMembership,
      linkedAccountsCount,
    };
  }

  async updateMember(organizationId: string, memberId: string, dto: any, actorUserId?: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member || member.organizationId !== organizationId) {
      throw new NotFoundException('Member not found in this organization');
    }

    const { firstName, lastName, phoneNumber, dob, gender, aiInsights, homeGymId } = dto;

    const data: any = {};
    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;
    if (phoneNumber !== undefined) data.phoneNumber = phoneNumber;
    if (dob !== undefined) data.dob = dob ? new Date(dob) : null;
    if (gender !== undefined) data.gender = gender;
    if (homeGymId !== undefined) data.homeGymId = homeGymId;

    if (aiInsights !== undefined) {
      data.aiInsights = {
        ...(member.aiInsights as any || {}),
        ...aiInsights,
      };
    }

    const updated = await this.prisma.member.update({
      where: { id: memberId },
      data,
      include: {
        homeGym: true,
        memberMeasurements: {
          orderBy: { date: 'desc' },
        },
        memberDocuments: true,
        attendances: {
          orderBy: { checkInTime: 'desc' },
          include: { gym: true },
        },
        memberMemberships: {
          include: { membershipPlan: true },
          orderBy: { startDate: 'desc' },
        },
      },
    });

    const activeMembership = this.resolveActiveMembership(updated.memberMemberships);

    const changedFields = Object.keys(data);
    if (changedFields.length > 0) {
      const actorName = await this.getActorName(actorUserId);
      await this.auditLogsService.logEvent({
        organizationId,
        userId: actorUserId,
        action: 'Member Updated',
        user: actorName,
        details: `Updated ${updated.firstName} ${updated.lastName}'s profile: ${changedFields.join(', ')}.`,
        eventType: 'MEMBER_UPDATED',
        eventCategory: 'Member',
        entityType: 'Member',
        entityId: updated.id,
        metadata: { changedFields },
      });
    }

    return {
      ...updated,
      activeMembership,
    };
  }

  async lookupGlobalMember(phoneNumber: string) {
    const cleanQuery = phoneNumber.replace(/\D/g, '');
    if (!cleanQuery) return null;

    const allMembers = await this.prisma.member.findMany();
    const match = allMembers.find(m => {
      const cleanDb = m.phoneNumber.replace(/\D/g, '');
      return cleanDb === cleanQuery || cleanDb.endsWith(cleanQuery) || cleanQuery.endsWith(cleanDb);
    });
    if (!match) return null;

    const linkedAccountsCount = allMembers.filter(m => {
      const cleanDb = m.phoneNumber.replace(/\D/g, '');
      return cleanDb === match.phoneNumber.replace(/\D/g, '');
    }).length;

    const verification = await this.prisma.phoneVerification.findUnique({
      where: { phoneNumber: match.phoneNumber },
    });

    return { ...match, phoneVerified: verification?.verified || false, linkedAccountsCount };
  }

  // --- Phone OTP verification (the "global account" identity proof) ---

  async sendPhoneOtp(phoneNumber: string) {
    if (!phoneNumber?.trim()) {
      throw new NotFoundException('Phone number is required');
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.prisma.phoneVerification.upsert({
      where: { phoneNumber },
      create: { phoneNumber, otpCodeHash: codeHash, otpExpiresAt: expiresAt, attempts: 0 },
      update: { otpCodeHash: codeHash, otpExpiresAt: expiresAt, attempts: 0 },
    });

    // No SMS gateway is wired up in this environment — log it like the rest
    // of this codebase's simulated dispatch (see ExpiryRemindersService) and
    // hand the code back so the caller can display/use it directly.
    console.log(`[PhoneOTP] Verification code for ${phoneNumber}: ${code} (expires in 5 min)`);

    return { sent: true, expiresIn: 300, devOtp: code };
  }

  async verifyPhoneOtp(phoneNumber: string, code: string) {
    const record = await this.prisma.phoneVerification.findUnique({ where: { phoneNumber } });
    if (!record || !record.otpCodeHash || !record.otpExpiresAt) {
      throw new NotFoundException('No verification code was requested for this number');
    }
    if (record.otpExpiresAt < new Date()) {
      throw new NotFoundException('Verification code has expired, please request a new one');
    }
    if (record.attempts >= 5) {
      throw new NotFoundException('Too many attempts, please request a new code');
    }

    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    if (codeHash !== record.otpCodeHash) {
      await this.prisma.phoneVerification.update({
        where: { phoneNumber },
        data: { attempts: { increment: 1 } },
      });
      throw new NotFoundException('Incorrect verification code');
    }

    await this.prisma.phoneVerification.update({
      where: { phoneNumber },
      data: {
        verified: true,
        verifiedAt: new Date(),
        otpCodeHash: null,
        otpExpiresAt: null,
        attempts: 0,
      },
    });

    // Carry the verification forward to every existing Member row for this phone
    // number (across all organizations) — verify once, trusted everywhere.
    await this.prisma.member.updateMany({
      where: { phoneNumber },
      data: { phoneVerified: true, phoneVerifiedAt: new Date() },
    });

    return { verified: true };
  }

  async addMeasurement(organizationId: string, memberId: string, dto: AddMeasurementDto) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member || member.organizationId !== organizationId) {
      throw new NotFoundException('Member not found in this organization');
    }

    return this.prisma.memberMeasurement.create({
      data: {
        memberId,
        ...dto,
      },
    });
  }

  async generateQrCode(organizationId: string, memberId: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member || member.organizationId !== organizationId) {
      throw new NotFoundException('Member not found in this organization');
    }

    const qrToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minutes validity

    return this.prisma.memberQrCode.create({
      data: {
        memberId,
        qrToken,
        expiresAt,
      },
    });
  }

  async listBranchesPublic(organizationId: string) {
    return this.prisma.gym.findMany({
      where: { organizationId, deletedAt: null },
      select: { id: true, name: true, code: true, address: true },
    });
  }
}
