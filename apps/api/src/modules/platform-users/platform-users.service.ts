import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ListPlatformUsersDto } from './dto/list-platform-users.dto';
import { InvitePlatformUserDto } from './dto/invite-platform-user.dto';
import { UpdatePlatformUserDto } from './dto/update-platform-user.dto';
import { SuspendPlatformUserDto } from './dto/suspend-platform-user.dto';
import { BulkPlatformUserActionDto } from './dto/bulk-platform-user-action.dto';
import { AssignOrganizationDto } from './dto/assign-organization.dto';

const AUDIT_CATEGORY = 'Platform Users';
const ONLINE_THRESHOLD_MS = 15 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

// Coarse permission summary per role, shown in the invite wizard and the
// profile workspace. Actual enforcement happens per-endpoint via
// @RequirePlatformRoles across every module - this is a human-readable view
// of what that adds up to, not a separate authorization source.
const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ['Full platform access', 'Manage platform users', 'Manage billing & subscriptions', 'Manage every module'],
  OPERATIONS: ['Manage organizations', 'Manage platform users', 'View billing'],
  FINANCE: ['Manage billing & subscriptions', 'Manage coupons', 'View organizations'],
  SALES: ['View organizations', 'Manage subscriptions', 'View plans'],
  SUPPORT: ['View organizations', 'Impersonate organizations', 'Manage support tickets'],
  DEVELOPER: ['View Feature & Limit Engine', 'View audit logs', 'View API management'],
  MARKETING: ['View organizations', 'Manage coupons'],
  CUSTOMER_SUCCESS: ['View organizations', 'Manage support tickets', 'View subscriptions'],
};

@Injectable()
export class PlatformUsersService {
  constructor(
    private prisma: DatabaseService,
    private auditLogsService: AuditLogsService,
  ) {}

  // ---------------------------------------------------------------------------
  // LIST + STATS
  // ---------------------------------------------------------------------------

  async list(query: ListPlatformUsersDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));

    const where: any = {};
    if (query.department) where.department = query.department;
    if (query.role) where.role = query.role;
    if (query.status) where.status = query.status;
    if (query.mfaEnabled === 'true') where.mfaEnabled = true;
    if (query.mfaEnabled === 'false') where.mfaEnabled = false;
    if (query.search) {
      where.user = {
        OR: [
          { fullName: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
          { phoneNumber: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    const [total, rows] = await Promise.all([
      this.prisma.platformAdminUser.count({ where }),
      this.prisma.platformAdminUser.findMany({
        where,
        include: { user: true, organizationAssignments: { where: { status: 'Active' } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const userIds = rows.map((r) => r.userId);
    const [lastLoginMap, lastActivityMap] = await Promise.all([this.batchLastLogin(userIds), this.batchLastActivity(userIds)]);

    let enriched = rows.map((r) => this.enrich(r, lastLoginMap.get(r.userId) ?? null, lastActivityMap.get(r.userId) ?? null));

    if (query.online === 'true') enriched = enriched.filter((u) => u.online);

    const sortField = query.sortBy || 'createdAt';
    const sortDir = query.sortDir === 'asc' ? 1 : -1;
    enriched.sort((a, b) => {
      if (sortField === 'name') return a.fullName.localeCompare(b.fullName) * sortDir;
      if (sortField === 'lastLogin') return ((new Date(a.lastLoginAt || 0).getTime() - new Date(b.lastLoginAt || 0).getTime())) * sortDir;
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * sortDir;
    });

    const effectiveTotal = query.online === 'true' ? enriched.length : total;
    const pageItems = enriched.slice((page - 1) * limit, page * limit);

    return { data: pageItems, total: effectiveTotal, page, limit, totalPages: Math.ceil(effectiveTotal / limit) };
  }

  async getStats() {
    const rows = await this.prisma.platformAdminUser.findMany({ select: { userId: true, role: true, status: true } });
    const userIds = rows.map((r) => r.userId);
    const lastActivityMap = await this.batchLastActivity(userIds);
    const onlineCount = rows.filter((r) => {
      const last = lastActivityMap.get(r.userId);
      return last && Date.now() - new Date(last).getTime() < ONLINE_THRESHOLD_MS;
    }).length;

    return {
      total: rows.length,
      active: rows.filter((r) => r.status === 'ACTIVE').length,
      pendingInvitations: rows.filter((r) => r.status === 'PENDING_INVITATION').length,
      suspended: rows.filter((r) => r.status === 'SUSPENDED').length,
      online: onlineCount,
      administrators: rows.filter((r) => r.role === 'SUPER_ADMIN').length,
      supportEngineers: rows.filter((r) => r.role === 'SUPPORT').length,
      developers: rows.filter((r) => r.role === 'DEVELOPER').length,
    };
  }

  async listDepartmentBreakdown() {
    const rows = await this.prisma.platformAdminUser.groupBy({ by: ['department'], _count: { department: true } });
    return rows.map((r) => ({ department: r.department || 'Unassigned', count: r._count.department }));
  }

  // ---------------------------------------------------------------------------
  // PROFILE
  // ---------------------------------------------------------------------------

  async getProfile(id: string) {
    const record = await this.prisma.platformAdminUser.findUnique({
      where: { id },
      include: { user: true, organizationAssignments: { include: { organization: { select: { id: true, name: true, slug: true } } } } },
    });
    if (!record) throw new NotFoundException('Platform user not found');

    const [lastLogin, lastActivity, sessions, timeline] = await Promise.all([
      this.batchLastLogin([record.userId]).then((m) => m.get(record.userId) ?? null),
      this.batchLastActivity([record.userId]).then((m) => m.get(record.userId) ?? null),
      this.deriveSessions(record.userId),
      this.getActivityTimeline(record.userId, record.id, 40),
    ]);

    const enriched = this.enrich(record, lastLogin, lastActivity);

    return {
      ...enriched,
      permissions: ROLE_PERMISSIONS[record.role] || [],
      assignedOrganizations: record.organizationAssignments.map((a) => ({
        id: a.id,
        organization: a.organization,
        accessLevel: a.accessLevel,
        status: a.status,
        assignedAt: a.assignedAt,
        assignedByName: a.assignedByName,
      })),
      security: {
        mfaEnabled: record.mfaEnabled,
        mfaEnabledAt: record.mfaEnabledAt,
        mfaRecoveryCodesRemaining: record.mfaRecoveryCodesRemaining,
        failedLoginAttempts: record.failedLoginAttempts,
        lockedUntil: record.lockedUntil,
        sessionTimeoutMinutes: record.sessionTimeoutMinutes,
        recentLogins: sessions.slice(0, 10),
      },
      sessions,
      timeline,
    };
  }

  // ---------------------------------------------------------------------------
  // INVITE / LIFECYCLE
  // ---------------------------------------------------------------------------

  async invite(dto: InvitePlatformUserDto, actorUserId: string) {
    const existingByPhone = await this.prisma.user.findUnique({ where: { phoneNumber: dto.phoneNumber } });
    let user = existingByPhone;
    if (user) {
      const existingPlatformUser = await this.prisma.platformAdminUser.findUnique({ where: { userId: user.id } });
      if (existingPlatformUser) throw new ConflictException('This phone number is already a Platform User.');
    } else {
      user = await this.prisma.user.create({ data: { fullName: dto.fullName, phoneNumber: dto.phoneNumber, email: dto.email, isVerified: false } });
    }

    const actorName = await this.getActorName(actorUserId);
    const platformUser = await this.prisma.platformAdminUser.create({
      data: {
        userId: user.id,
        role: dto.role as any,
        department: dto.department,
        status: 'PENDING_INVITATION',
        isActive: false,
        invitedAt: new Date(),
        invitedByName: actorName,
        invitationExpiresAt: new Date(Date.now() + 7 * DAY),
      },
    });

    await this.logEvent(actorUserId, 'Platform User Invited', `Invited ${dto.fullName} as ${dto.role.replace('_', ' ')}${dto.department ? ` (${dto.department})` : ''}.`, platformUser.id, user.id);
    return this.getProfile(platformUser.id);
  }

  async resendInvitation(id: string, actorUserId: string) {
    const record = await this.assertExists(id);
    if (record.status !== 'PENDING_INVITATION') throw new BadRequestException('This user has already accepted their invitation.');
    await this.prisma.platformAdminUser.update({ where: { id }, data: { invitationExpiresAt: new Date(Date.now() + 7 * DAY) } });
    await this.logEvent(actorUserId, 'Invitation Resent', `Resent the platform invitation to ${record.user.fullName}.`, id, record.userId);
    return { ok: true };
  }

  async cancelInvitation(id: string, actorUserId: string) {
    const record = await this.assertExists(id);
    if (record.status !== 'PENDING_INVITATION') throw new BadRequestException('This user has already accepted their invitation.');
    await this.prisma.platformAdminUser.delete({ where: { id } });
    await this.logEvent(actorUserId, 'Invitation Cancelled', `Cancelled the pending platform invitation for ${record.user.fullName}.`, id, record.userId);
    return { ok: true };
  }

  async update(id: string, dto: UpdatePlatformUserDto, actorUserId: string) {
    const record = await this.assertExists(id);
    const changes: string[] = [];

    const userData: any = {};
    if (dto.fullName !== undefined && dto.fullName !== record.user.fullName) { userData.fullName = dto.fullName; changes.push('name'); }
    if (dto.email !== undefined && dto.email !== record.user.email) { userData.email = dto.email; changes.push('email'); }
    if (dto.phoneNumber !== undefined && dto.phoneNumber !== record.user.phoneNumber) { userData.phoneNumber = dto.phoneNumber; changes.push('phone'); }
    if (Object.keys(userData).length) await this.prisma.user.update({ where: { id: record.userId }, data: userData });

    const platformData: any = {};
    if (dto.department !== undefined && dto.department !== record.department) { platformData.department = dto.department; changes.push('department'); }
    if (dto.role !== undefined && dto.role !== record.role) { platformData.role = dto.role; changes.push('role'); }
    if (Object.keys(platformData).length) await this.prisma.platformAdminUser.update({ where: { id }, data: platformData });

    if (changes.length) {
      const roleChanged = changes.includes('role');
      await this.logEvent(
        actorUserId,
        roleChanged ? 'Role Changed' : 'Platform User Updated',
        `Updated ${record.user.fullName}: ${changes.join(', ')}.`,
        id,
        record.userId,
        roleChanged ? 'PLATFORM_ROLE_CHANGED' : undefined,
      );
    }
    return this.getProfile(id);
  }

  async resetPassword(id: string, actorUserId: string) {
    // GymFlow authenticates via phone OTP, not passwords - there is no
    // password store to rotate. This audits the intent so the action still
    // shows up wherever a real provider integration would eventually hook in.
    const record = await this.assertExists(id);
    await this.logEvent(actorUserId, 'Password Reset Requested', `Requested a password reset for ${record.user.fullName}.`, id, record.userId, 'PLATFORM_PASSWORD_RESET_REQUESTED');
    return { ok: true };
  }

  async resetMfa(id: string, actorUserId: string) {
    const record = await this.assertExists(id);
    await this.prisma.platformAdminUser.update({ where: { id }, data: { mfaEnabled: false, mfaEnabledAt: null, mfaRecoveryCodesRemaining: null } });
    await this.logEvent(actorUserId, 'MFA Reset', `Reset multi-factor authentication for ${record.user.fullName}.`, id, record.userId, 'PLATFORM_MFA_RESET');
    return { ok: true };
  }

  async suspend(id: string, dto: SuspendPlatformUserDto, actorUserId: string) {
    const record = await this.assertExists(id);
    if (record.status === 'SUSPENDED') throw new BadRequestException('User is already suspended.');
    await this.prisma.platformAdminUser.update({ where: { id }, data: { status: 'SUSPENDED', isActive: false, suspendedAt: new Date(), suspendReason: dto.reason || null } });
    await this.logEvent(actorUserId, 'Platform User Suspended', `Suspended ${record.user.fullName}${dto.reason ? `: ${dto.reason}` : '.'}`, id, record.userId, 'PLATFORM_USER_SUSPENDED');
    return { ok: true };
  }

  async activate(id: string, actorUserId: string) {
    const record = await this.assertExists(id);
    if (record.status === 'ACTIVE') throw new BadRequestException('User is already active.');
    await this.prisma.platformAdminUser.update({
      where: { id },
      data: { status: 'ACTIVE', isActive: true, suspendedAt: null, suspendReason: null, deactivatedAt: null, archivedAt: null, lockedUntil: null, failedLoginAttempts: 0 },
    });
    await this.logEvent(actorUserId, 'Platform User Activated', `Activated ${record.user.fullName}.`, id, record.userId, 'PLATFORM_USER_ACTIVATED');
    return { ok: true };
  }

  async deactivate(id: string, actorUserId: string) {
    const record = await this.assertExists(id);
    await this.prisma.platformAdminUser.update({ where: { id }, data: { status: 'DISABLED', isActive: false, deactivatedAt: new Date() } });
    await this.logEvent(actorUserId, 'Platform User Deactivated', `Deactivated ${record.user.fullName}.`, id, record.userId, 'PLATFORM_USER_DEACTIVATED');
    return { ok: true };
  }

  async archive(id: string, actorUserId: string) {
    const record = await this.assertExists(id);
    await this.prisma.platformAdminUser.update({ where: { id }, data: { status: 'ARCHIVED', isActive: false, archivedAt: new Date() } });
    await this.logEvent(actorUserId, 'Platform User Archived', `Archived ${record.user.fullName}.`, id, record.userId, 'PLATFORM_USER_ARCHIVED');
    return { ok: true };
  }

  async remove(id: string, actorUserId: string) {
    const record = await this.assertExists(id);
    await this.prisma.platformAdminUser.delete({ where: { id } });
    await this.logEvent(actorUserId, 'Platform User Deleted', `Deleted platform user ${record.user.fullName}.`, id, record.userId, 'PLATFORM_USER_DELETED');
    return { ok: true };
  }

  async unlock(id: string, actorUserId: string) {
    const record = await this.assertExists(id);
    if (record.status !== 'LOCKED') throw new BadRequestException('User is not locked.');
    await this.prisma.platformAdminUser.update({ where: { id }, data: { status: 'ACTIVE', isActive: true, failedLoginAttempts: 0, lockedUntil: null } });
    await this.logEvent(actorUserId, 'Platform User Unlocked', `Unlocked ${record.user.fullName}.`, id, record.userId, 'PLATFORM_USER_UNLOCKED');
    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  // BULK ACTIONS
  // ---------------------------------------------------------------------------

  async bulk(dto: BulkPlatformUserActionDto, actorUserId: string) {
    const records = await this.prisma.platformAdminUser.findMany({ where: { id: { in: dto.userIds } }, include: { user: true } });
    if (records.length === 0) throw new NotFoundException('No matching platform users found.');

    let affected = 0;
    switch (dto.action) {
      case 'activate':
        affected = (await this.prisma.platformAdminUser.updateMany({ where: { id: { in: dto.userIds }, status: { not: 'ACTIVE' } }, data: { status: 'ACTIVE', isActive: true, suspendedAt: null, deactivatedAt: null, archivedAt: null } })).count;
        break;
      case 'suspend':
        affected = (await this.prisma.platformAdminUser.updateMany({ where: { id: { in: dto.userIds }, status: { not: 'SUSPENDED' } }, data: { status: 'SUSPENDED', isActive: false, suspendedAt: new Date(), suspendReason: dto.reason || 'Bulk suspension.' } })).count;
        break;
      case 'assign_department':
        if (!dto.department) throw new BadRequestException('department is required.');
        affected = (await this.prisma.platformAdminUser.updateMany({ where: { id: { in: dto.userIds } }, data: { department: dto.department } })).count;
        break;
      case 'assign_role':
        if (!dto.role) throw new BadRequestException('role is required.');
        affected = (await this.prisma.platformAdminUser.updateMany({ where: { id: { in: dto.userIds } }, data: { role: dto.role as any } })).count;
        break;
      case 'delete':
        affected = (await this.prisma.platformAdminUser.deleteMany({ where: { id: { in: dto.userIds } } })).count;
        break;
      case 'export':
        affected = records.length;
        break;
      default:
        throw new BadRequestException(`Unsupported bulk action "${dto.action}".`);
    }

    await this.logEvent(actorUserId, 'Bulk Action Applied', `Bulk "${dto.action}" applied to ${affected} of ${dto.userIds.length} platform user(s).`, null, null, 'PLATFORM_USERS_BULK_ACTION');
    return { action: dto.action, requested: dto.userIds.length, affected };
  }

  async recordExport(actorUserId: string, format: string, count: number) {
    await this.logEvent(actorUserId, 'Platform Users Exported', `Exported ${count} platform user(s) as ${format.toUpperCase()}.`, null, null, 'PLATFORM_USERS_EXPORTED');
    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  // SESSIONS
  // ---------------------------------------------------------------------------

  async terminateSession(id: string, sessionId: string, actorUserId: string) {
    const record = await this.assertExists(id);
    await this.logEvent(actorUserId, 'Session Terminated', `Terminated a session for ${record.user.fullName}.`, id, record.userId, 'SESSION_REVOKED', { sessionId });
    return { ok: true };
  }

  async terminateAllSessions(id: string, actorUserId: string) {
    const record = await this.assertExists(id);
    await this.logEvent(actorUserId, 'All Sessions Terminated', `Terminated all active sessions for ${record.user.fullName}.`, id, record.userId, 'ALL_SESSIONS_REVOKED');
    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  // ASSIGNED ORGANIZATIONS
  // ---------------------------------------------------------------------------

  async assignOrganization(id: string, dto: AssignOrganizationDto, actorUserId: string) {
    const record = await this.assertExists(id);
    const org = await this.prisma.organization.findUnique({ where: { id: dto.organizationId } });
    if (!org) throw new NotFoundException('Organization not found');
    const actorName = await this.getActorName(actorUserId);

    const assignment = await this.prisma.platformUserOrgAssignment.upsert({
      where: { platformUserId_organizationId: { platformUserId: id, organizationId: dto.organizationId } },
      update: { accessLevel: dto.accessLevel, status: 'Active', assignedByName: actorName, assignedAt: new Date() },
      create: { platformUserId: id, organizationId: dto.organizationId, accessLevel: dto.accessLevel, assignedByName: actorName },
    });

    await this.logEvent(actorUserId, 'Organization Assigned', `Assigned "${org.name}" to ${record.user.fullName} (${dto.accessLevel} access).`, id, record.userId, 'PLATFORM_ORG_ASSIGNED');
    return assignment;
  }

  async removeOrganizationAssignment(id: string, assignmentId: string, actorUserId: string) {
    const record = await this.assertExists(id);
    const assignment = await this.prisma.platformUserOrgAssignment.findFirst({ where: { id: assignmentId, platformUserId: id }, include: { organization: true } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    await this.prisma.platformUserOrgAssignment.update({ where: { id: assignmentId }, data: { status: 'Revoked' } });
    await this.logEvent(actorUserId, 'Organization Unassigned', `Removed "${assignment.organization.name}" from ${record.user.fullName}.`, id, record.userId, 'PLATFORM_ORG_UNASSIGNED');
    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  // DEPARTMENTS
  // ---------------------------------------------------------------------------

  listDepartments() {
    return this.prisma.platformDepartment.findMany({ orderBy: [{ isSystem: 'desc' }, { name: 'asc' }] });
  }

  async createDepartment(name: string, description: string | undefined, actorUserId: string) {
    const existing = await this.prisma.platformDepartment.findUnique({ where: { name } });
    if (existing) throw new ConflictException(`Department "${name}" already exists.`);
    const dept = await this.prisma.platformDepartment.create({ data: { name, description, isSystem: false } });
    await this.logEvent(actorUserId, 'Department Created', `Created department "${name}".`, null, null, 'PLATFORM_DEPARTMENT_CREATED');
    return dept;
  }

  async updateDepartment(id: string, description: string | undefined, actorUserId: string) {
    const dept = await this.prisma.platformDepartment.findUnique({ where: { id } });
    if (!dept) throw new NotFoundException('Department not found');
    const updated = await this.prisma.platformDepartment.update({ where: { id }, data: { description } });
    await this.logEvent(actorUserId, 'Department Updated', `Updated department "${dept.name}".`, null, null, 'PLATFORM_DEPARTMENT_UPDATED');
    return updated;
  }

  async deleteDepartment(id: string, actorUserId: string) {
    const dept = await this.prisma.platformDepartment.findUnique({ where: { id } });
    if (!dept) throw new NotFoundException('Department not found');
    if (dept.isSystem) throw new BadRequestException('Default departments cannot be deleted.');
    const usage = await this.prisma.platformAdminUser.count({ where: { department: dept.name } });
    if (usage > 0) throw new BadRequestException(`"${dept.name}" is still assigned to ${usage} platform user(s).`);
    await this.prisma.platformDepartment.delete({ where: { id } });
    await this.logEvent(actorUserId, 'Department Deleted', `Deleted department "${dept.name}".`, null, null, 'PLATFORM_DEPARTMENT_DELETED');
    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private enrich(record: any, lastLoginAt: Date | null, lastActivityAt: Date | null) {
    const online = !!lastActivityAt && Date.now() - new Date(lastActivityAt).getTime() < ONLINE_THRESHOLD_MS;
    return {
      id: record.id,
      userId: record.userId,
      fullName: record.user.fullName,
      email: record.user.email,
      phone: record.user.phoneNumber,
      department: record.department,
      role: record.role,
      status: record.status,
      isActive: record.isActive,
      mfaEnabled: record.mfaEnabled,
      lastLoginAt,
      lastActivityAt,
      online,
      createdAt: record.createdAt,
      invitedAt: record.invitedAt,
      invitedByName: record.invitedByName,
      invitationExpiresAt: record.invitationExpiresAt,
      acceptedAt: record.acceptedAt,
      suspendedAt: record.suspendedAt,
      suspendReason: record.suspendReason,
      deactivatedAt: record.deactivatedAt,
      archivedAt: record.archivedAt,
      lockedUntil: record.lockedUntil,
      failedLoginAttempts: record.failedLoginAttempts,
      assignedOrganizationCount: record.organizationAssignments?.length ?? 0,
    };
  }

  private async batchLastLogin(userIds: string[]): Promise<Map<string, Date>> {
    if (userIds.length === 0) return new Map();
    const rows = await this.prisma.auditLog.groupBy({ by: ['userId'], where: { userId: { in: userIds }, eventType: 'LOGIN_SUCCESS' }, _max: { createdAt: true } });
    const map = new Map<string, Date>();
    for (const r of rows) if (r.userId && r._max.createdAt) map.set(r.userId, r._max.createdAt);
    return map;
  }

  private async batchLastActivity(userIds: string[]): Promise<Map<string, Date>> {
    if (userIds.length === 0) return new Map();
    const rows = await this.prisma.auditLog.groupBy({ by: ['userId'], where: { userId: { in: userIds } }, _max: { createdAt: true } });
    const map = new Map<string, Date>();
    for (const r of rows) if (r.userId && r._max.createdAt) map.set(r.userId, r._max.createdAt);
    return map;
  }

  private async deriveSessions(userId: string) {
    const [logins, endEvents, terminateAllEvents] = await Promise.all([
      this.prisma.auditLog.findMany({ where: { userId, eventType: 'LOGIN_SUCCESS' }, orderBy: { createdAt: 'desc' }, take: 20 }),
      this.prisma.auditLog.findMany({ where: { userId, eventType: { in: ['SESSION_REVOKED', 'LOGOUT'] } } }),
      this.prisma.auditLog.findFirst({ where: { userId, eventType: 'ALL_SESSIONS_REVOKED' }, orderBy: { createdAt: 'desc' } }),
    ]);

    const revokedSessionIds = new Set(endEvents.map((e) => (e.metadata as any)?.sessionId).filter(Boolean));
    const allRevokedAt = terminateAllEvents?.createdAt ?? null;

    return logins.map((log) => {
      const meta = (log.metadata as any) || {};
      const sessionId = meta.sessionId || log.id;
      const revoked = revokedSessionIds.has(sessionId) || (allRevokedAt && log.createdAt < allRevokedAt);
      return {
        id: sessionId,
        device: meta.device || 'Desktop',
        browser: meta.browser || 'Chrome',
        ipAddress: log.ipAddress || 'Unknown',
        createdAt: log.createdAt,
        status: revoked ? 'Revoked' : 'Active',
      };
    });
  }

  private async getActivityTimeline(userId: string, platformUserId: string, limit: number) {
    const logs = await this.prisma.auditLog.findMany({
      where: { OR: [{ userId }, { entityType: 'PlatformAdminUser', entityId: platformUserId }] },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return logs.map((l) => ({ id: l.id, action: l.action, details: l.details, user: l.user, eventType: l.eventType, createdAt: l.createdAt }));
  }

  private async assertExists(id: string) {
    const record = await this.prisma.platformAdminUser.findUnique({ where: { id }, include: { user: true } });
    if (!record) throw new NotFoundException('Platform user not found');
    return record;
  }

  private async getActorName(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user?.fullName || 'Platform Admin';
  }

  // Note: `userId` on the audit row is always the ACTOR who performed the
  // action (matches every other module's convention and is what "last
  // activity"/"online" are derived from). `targetUserId` is only used to
  // enrich `details`/metadata for readability - the target platform user's
  // own timeline is reconstructed via entityType/entityId in
  // getActivityTimeline, not by misattributing userId to them.
  private async logEvent(actorUserId: string, action: string, details: string, entityId: string | null, targetUserId: string | null, eventType?: string, metadata?: any) {
    const actorName = await this.getActorName(actorUserId);
    await this.auditLogsService.logEvent({
      organizationId: null,
      userId: actorUserId,
      action,
      user: actorName,
      details,
      eventType: eventType || action.toUpperCase().replace(/\s+/g, '_'),
      eventCategory: AUDIT_CATEGORY,
      entityType: 'PlatformAdminUser',
      entityId: entityId || undefined,
      metadata: { ...(metadata || {}), targetUserId },
    });
  }
}
