import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../../core/database/database.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PlatformAuthorizationService } from './platform-authorization.service';
import { ListRolesDto } from './dto/list-roles.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { SetPermissionsDto, SetGroupsDto } from './dto/set-permissions.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { GrantTemporaryAccessDto } from './dto/grant-temporary-access.dto';

const AUDIT_CATEGORY = 'Roles & Permissions';

@Injectable()
export class PlatformRolesService {
  constructor(
    private prisma: DatabaseService,
    private auditLogsService: AuditLogsService,
    private authz: PlatformAuthorizationService,
  ) {}

  // ---------------------------------------------------------------------------
  // DASHBOARD
  // ---------------------------------------------------------------------------

  async getDashboard() {
    await this.authz.expireStaleAssignments();
    const [totalRoles, systemRoles, permissionGroups, activeAssignments, temporaryGrants, recentRoles] = await Promise.all([
      this.prisma.platformRoleDefinition.count(),
      this.prisma.platformRoleDefinition.count({ where: { isSystem: true } }),
      this.prisma.platformPermissionGroup.count(),
      this.prisma.platformUserRoleAssignment.findMany({ where: { status: 'Active' }, select: { platformUserId: true } }),
      this.prisma.platformUserRoleAssignment.count({ where: { status: 'Active', isTemporary: true } }),
      this.prisma.platformRoleDefinition.findMany({ orderBy: { updatedAt: 'desc' }, take: 5 }),
    ]);

    const platformUsersAssigned = new Set(activeAssignments.map((a) => a.platformUserId)).size;

    return {
      totalRoles,
      systemRoles,
      customRoles: totalRoles - systemRoles,
      permissionGroups,
      platformUsersAssigned,
      temporaryAccessGrants: temporaryGrants,
      recentlyModifiedRoles: recentRoles.map((r) => ({ id: r.id, name: r.name, isSystem: r.isSystem, updatedAt: r.updatedAt })),
    };
  }

  // ---------------------------------------------------------------------------
  // LIST / DETAILS
  // ---------------------------------------------------------------------------

  async list(query: ListRolesDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.kind === 'system') where.isSystem = true;
    if (query.kind === 'custom') where.isSystem = false;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, roles] = await Promise.all([
      this.prisma.platformRoleDefinition.count({ where }),
      this.prisma.platformRoleDefinition.findMany({
        where,
        orderBy: { [query.sortBy === 'name' ? 'name' : 'updatedAt']: query.sortDir === 'asc' ? 'asc' : 'desc' },
        include: { _count: { select: { permissions: true, userAssignments: true } } },
      }),
    ]);

    const pageItems = roles.slice((page - 1) * limit, page * limit);
    const data = pageItems.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      status: r.status,
      colorTag: r.colorTag,
      createdByName: r.createdByName,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      permissionCount: r._count.permissions,
      usersAssigned: r._count.userAssignments,
    }));

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getDetails(id: string) {
    const role = await this.assertExists(id);
    const [permissions, groupAssignments, inheritsFrom, inheritedBy, assignments, auditEntries] = await Promise.all([
      this.prisma.platformRolePermission.findMany({ where: { roleId: id }, include: { permission: { include: { category: true, action: true } } } }),
      this.prisma.platformRoleGroupAssignment.findMany({ where: { roleId: id }, include: { group: true } }),
      this.prisma.platformRoleInheritance.findMany({ where: { roleId: id }, include: { inheritsRole: true } }),
      this.prisma.platformRoleInheritance.findMany({ where: { inheritsRoleId: id }, include: { role: true } }),
      this.prisma.platformUserRoleAssignment.findMany({
        where: { roleId: id, status: 'Active' },
        include: { platformUser: { include: { user: true } } },
        orderBy: { assignedAt: 'desc' },
      }),
      this.prisma.auditLog.findMany({
        where: { eventCategory: AUDIT_CATEGORY, entityId: id },
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
    ]);

    const effective = await this.authz.getEffectivePermissionsForRoles([id]);

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      status: role.status,
      colorTag: role.colorTag,
      createdByName: role.createdByName,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: permissions.map((p) => ({
        key: p.permission.key,
        label: p.permission.label,
        category: p.permission.category.label,
        categoryKey: p.permission.categoryKey,
        action: p.permission.action.label,
        effect: p.effect,
        note: p.note,
        isSensitive: p.permission.isSensitive,
      })),
      permissionGroups: groupAssignments.map((g) => ({ id: g.group.id, name: g.group.name, effect: g.effect })),
      inheritsFrom: inheritsFrom.map((i) => ({ id: i.inheritsRole.id, name: i.inheritsRole.name })),
      inheritedBy: inheritedBy.map((i) => ({ id: i.role.id, name: i.role.name })),
      restrictions: permissions.filter((p) => p.effect === 'DENY').map((p) => ({ key: p.permission.key, label: p.permission.label, note: p.note })),
      users: assignments.map((a) => ({
        assignmentId: a.id,
        platformUserId: a.platformUserId,
        fullName: a.platformUser.user.fullName,
        email: a.platformUser.user.email,
        department: a.platformUser.department,
        isTemporary: a.isTemporary,
        expiresAt: a.expiresAt,
        assignedByName: a.assignedByName,
        assignedAt: a.assignedAt,
      })),
      effectivePermissionCount: effective.filter((p) => p.effect === 'ALLOW').length,
      auditHistory: auditEntries,
    };
  }

  // ---------------------------------------------------------------------------
  // CREATE / UPDATE / DELETE
  // ---------------------------------------------------------------------------

  async create(dto: CreateRoleDto, actorUserId: string) {
    const existing = await this.prisma.platformRoleDefinition.findFirst({ where: { name: dto.name } });
    if (existing) throw new ConflictException(`A role named "${dto.name}" already exists.`);

    const actorName = await this.getActorName(actorUserId);
    const slug = this.slugify(dto.name);

    let permissions = dto.permissions || [];
    let groupIds = dto.groupIds || [];
    if (dto.fromTemplateId) {
      const template = await this.prisma.platformRoleTemplate.findUnique({ where: { id: dto.fromTemplateId } });
      if (template) {
        const templatePerms = await this.prisma.platformPermission.findMany({ where: { key: { in: template.permissionKeys } } });
        permissions = [...permissions, ...templatePerms.map((p) => ({ permissionKey: p.key, effect: 'ALLOW' as const }))];
        groupIds = [...groupIds, ...template.groupIds];
      }
    }

    const role = await this.prisma.platformRoleDefinition.create({
      data: { name: dto.name, slug, description: dto.description, colorTag: dto.colorTag, createdByName: actorName },
    });

    if (permissions.length) await this.applyPermissions(role.id, permissions);
    if (groupIds.length) await this.applyGroups(role.id, groupIds);
    if (dto.inheritsRoleIds?.length) {
      for (const parentId of dto.inheritsRoleIds) {
        if (await this.authz.wouldCreateCycle(role.id, parentId)) continue;
        await this.prisma.platformRoleInheritance.create({ data: { roleId: role.id, inheritsRoleId: parentId } });
      }
    }
    // PLT-010: when this one request produces multiple audit events (the
    // role itself + N assignments), thread a shared correlationId through
    // them so they can be browsed as one business operation in Related Events.
    const correlationId = dto.assignUserIds?.length ? randomUUID() : undefined;

    if (dto.assignUserIds?.length) {
      for (const platformUserId of dto.assignUserIds) {
        await this.assign(role.id, { platformUserId }, actorUserId, correlationId);
      }
    }

    await this.logEvent(actorUserId, 'Role Created', `Created role "${role.name}".`, role.id, 'PLATFORM_ROLE_CREATED', correlationId);
    return this.getDetails(role.id);
  }

  async update(id: string, dto: UpdateRoleDto, actorUserId: string) {
    const role = await this.assertExists(id);
    const changes: string[] = [];
    const data: any = {};
    if (dto.name !== undefined && dto.name !== role.name) { data.name = dto.name; changes.push('name'); }
    if (dto.description !== undefined && dto.description !== role.description) { data.description = dto.description; changes.push('description'); }
    if (dto.colorTag !== undefined && dto.colorTag !== role.colorTag) { data.colorTag = dto.colorTag; changes.push('color'); }
    if (dto.status !== undefined && dto.status !== role.status) {
      if (role.isSystem && dto.status === 'Archived') throw new BadRequestException('System roles cannot be archived.');
      data.status = dto.status;
      changes.push('status');
    }
    if (Object.keys(data).length) await this.prisma.platformRoleDefinition.update({ where: { id }, data });
    if (changes.length) await this.logEvent(actorUserId, 'Role Updated', `Updated role "${role.name}": ${changes.join(', ')}.`, id, 'PLATFORM_ROLE_UPDATED');
    return this.getDetails(id);
  }

  async remove(id: string, actorUserId: string) {
    const role = await this.assertExists(id);
    if (role.isSystem) throw new BadRequestException('System roles cannot be deleted.');
    if (await this.authz.wouldRemoveLastSuperAdminRole(id)) {
      throw new BadRequestException('Cannot delete the last Super Administrator role.');
    }
    const activeAssignments = await this.prisma.platformUserRoleAssignment.count({ where: { roleId: id, status: 'Active' } });
    if (activeAssignments > 0) throw new BadRequestException(`This role is assigned to ${activeAssignments} user(s). Remove those assignments first.`);

    await this.prisma.platformRoleDefinition.delete({ where: { id } });
    await this.logEvent(actorUserId, 'Role Removed', `Deleted role "${role.name}".`, id, 'PLATFORM_ROLE_DELETED');
    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  // PERMISSIONS / GROUPS / INHERITANCE
  // ---------------------------------------------------------------------------

  private async applyPermissions(roleId: string, grants: { permissionKey: string; effect: 'ALLOW' | 'DENY'; note?: string }[]) {
    const permissions = await this.prisma.platformPermission.findMany({ where: { key: { in: grants.map((g) => g.permissionKey) } } });
    const idByKey = new Map(permissions.map((p) => [p.key, p.id]));
    for (const grant of grants) {
      const permissionId = idByKey.get(grant.permissionKey);
      if (!permissionId) continue;
      await this.prisma.platformRolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: { effect: grant.effect, note: grant.note },
        create: { roleId, permissionId, effect: grant.effect, note: grant.note },
      });
    }
  }

  private async applyGroups(roleId: string, groupIds: string[]) {
    for (const groupId of groupIds) {
      await this.prisma.platformRoleGroupAssignment.upsert({
        where: { roleId_groupId: { roleId, groupId } },
        update: {},
        create: { roleId, groupId },
      });
    }
  }

  async setPermissions(id: string, dto: SetPermissionsDto, actorUserId: string) {
    const role = await this.assertExists(id);
    if (role.isSystem) {
      const sensitiveDenials = dto.permissions.filter((p) => p.effect === 'ALLOW').length === 0 && dto.permissions.length > 0;
      // System roles may still have their matrix tuned (e.g. fixing a restriction), just not wiped entirely by mistake.
      if (sensitiveDenials) throw new BadRequestException('Refusing to remove all permissions from a system role in one call.');
    }
    await this.prisma.platformRolePermission.deleteMany({ where: { roleId: id } });
    await this.applyPermissions(id, dto.permissions);
    await this.logEvent(actorUserId, 'Permission Changed', `Updated the permission matrix for "${role.name}" (${dto.permissions.length} grants).`, id, 'PLATFORM_ROLE_PERMISSIONS_CHANGED');
    return this.getDetails(id);
  }

  async setGroups(id: string, dto: SetGroupsDto, actorUserId: string) {
    const role = await this.assertExists(id);
    await this.prisma.platformRoleGroupAssignment.deleteMany({ where: { roleId: id } });
    await this.applyGroups(id, dto.groupIds);
    await this.logEvent(actorUserId, 'Permission Changed', `Updated permission group assignments for "${role.name}".`, id, 'PLATFORM_ROLE_GROUPS_CHANGED');
    return this.getDetails(id);
  }

  async addInheritance(id: string, inheritsRoleId: string, actorUserId: string) {
    const role = await this.assertExists(id);
    const parent = await this.assertExists(inheritsRoleId);
    if (await this.authz.wouldCreateCycle(id, inheritsRoleId)) {
      throw new BadRequestException('This would create a circular role inheritance chain.');
    }
    await this.prisma.platformRoleInheritance.upsert({
      where: { roleId_inheritsRoleId: { roleId: id, inheritsRoleId } },
      update: {},
      create: { roleId: id, inheritsRoleId },
    });
    await this.logEvent(actorUserId, 'Role Updated', `"${role.name}" now inherits "${parent.name}".`, id, 'PLATFORM_ROLE_INHERITANCE_ADDED');
    return this.getDetails(id);
  }

  async removeInheritance(id: string, inheritsRoleId: string, actorUserId: string) {
    const role = await this.assertExists(id);
    await this.prisma.platformRoleInheritance.deleteMany({ where: { roleId: id, inheritsRoleId } });
    await this.logEvent(actorUserId, 'Role Updated', `Removed an inherited role from "${role.name}".`, id, 'PLATFORM_ROLE_INHERITANCE_REMOVED');
    return this.getDetails(id);
  }

  async getMatrix() {
    const [roles, permissions, rolePermissions] = await Promise.all([
      this.prisma.platformRoleDefinition.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.platformPermission.findMany({ include: { category: true }, orderBy: [{ categoryKey: 'asc' }, { label: 'asc' }] }),
      this.prisma.platformRolePermission.findMany(),
    ]);

    const directByRole = new Map<string, Map<string, 'ALLOW' | 'DENY'>>();
    for (const rp of rolePermissions) {
      if (!directByRole.has(rp.roleId)) directByRole.set(rp.roleId, new Map());
      directByRole.get(rp.roleId)!.set(rp.permissionId, rp.effect);
    }

    const cells: Record<string, Record<string, { state: 'ALLOW' | 'DENY' | 'INHERITED' | 'INHERITED_DENY' | 'NONE'; sourceRoleName?: string }>> = {};
    for (const role of roles) {
      const effective = await this.authz.getEffectivePermissionsForRoles([role.id]);
      const effectiveByKey = new Map(effective.map((e) => [e.key, e]));
      const direct = directByRole.get(role.id) || new Map();
      cells[role.id] = {};
      for (const perm of permissions) {
        const directEffect = direct.get(perm.id);
        if (directEffect) {
          cells[role.id][perm.key] = { state: directEffect };
          continue;
        }
        const inherited = effectiveByKey.get(perm.key);
        if (inherited) {
          // Inherited DENY is a restriction flowing down from a parent role
          // (e.g. "Support cannot view revenue") and must stay visually
          // distinct from an inherited grant, even though the underlying
          // evaluation already applies deny-overrides correctly.
          cells[role.id][perm.key] = {
            state: inherited.effect === 'DENY' ? 'INHERITED_DENY' : 'INHERITED',
            sourceRoleName: inherited.sourceRoleNames.find((n) => n !== role.name),
          };
        } else {
          cells[role.id][perm.key] = { state: 'NONE' };
        }
      }
    }

    return {
      roles: roles.map((r) => ({ id: r.id, name: r.name, isSystem: r.isSystem })),
      permissions: permissions.map((p) => ({ key: p.key, label: p.label, category: p.category.label, categoryKey: p.categoryKey, isSensitive: p.isSensitive })),
      cells,
    };
  }

  async getEffectivePermissions(id: string) {
    await this.assertExists(id);
    return this.authz.getEffectivePermissionsForRoles([id]);
  }

  async getUserEffectivePermissions(platformUserId: string) {
    return this.authz.getEffectivePermissionsForUser(platformUserId);
  }

  // ---------------------------------------------------------------------------
  // ASSIGNMENT / TEMPORARY ACCESS
  // ---------------------------------------------------------------------------

  async assign(id: string, dto: AssignRoleDto, actorUserId: string, correlationId?: string) {
    const role = await this.assertExists(id);
    const platformUser = await this.prisma.platformAdminUser.findUnique({ where: { id: dto.platformUserId }, include: { user: true } });
    if (!platformUser) throw new NotFoundException('Platform user not found');

    const actorName = await this.getActorName(actorUserId);
    const assignment = await this.prisma.platformUserRoleAssignment.create({
      data: {
        platformUserId: dto.platformUserId,
        roleId: id,
        isTemporary: !!dto.isTemporary,
        reason: dto.reason,
        approverName: dto.approverName,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        assignedByName: actorName,
        status: 'Active',
      },
    });

    await this.logEvent(
      actorUserId,
      dto.isTemporary ? 'Temporary Access Granted' : 'Role Assigned',
      `Assigned "${role.name}" to ${platformUser.user.fullName}${dto.isTemporary ? ` until ${dto.expiresAt}` : ''}.`,
      id,
      dto.isTemporary ? 'PLATFORM_TEMP_ACCESS_GRANTED' : 'PLATFORM_ROLE_ASSIGNED',
      correlationId,
    );
    return assignment;
  }

  async unassign(id: string, platformUserId: string, actorUserId: string) {
    const role = await this.assertExists(id);
    const assignment = await this.prisma.platformUserRoleAssignment.findFirst({ where: { roleId: id, platformUserId, status: 'Active' }, include: { platformUser: { include: { user: true } } } });
    if (!assignment) throw new NotFoundException('Active assignment not found');

    if (await this.authz.isLastActiveSuperAdmin(id, platformUserId)) {
      throw new BadRequestException('Cannot remove the last active Super Administrator.');
    }

    const actorName = await this.getActorName(actorUserId);
    await this.prisma.platformUserRoleAssignment.update({
      where: { id: assignment.id },
      data: { status: 'Revoked', revokedAt: new Date(), revokedByName: actorName },
    });

    await this.logEvent(actorUserId, 'Role Removed', `Removed "${role.name}" from ${assignment.platformUser.user.fullName}.`, id, 'PLATFORM_ROLE_UNASSIGNED');
    return { ok: true };
  }

  async listAssignments(query: { search?: string; page?: number; limit?: number }) {
    await this.authz.expireStaleAssignments();
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));

    const where: any = { status: 'Active' };
    if (query.search) {
      where.platformUser = { user: { fullName: { contains: query.search, mode: 'insensitive' } } };
    }

    const [total, rows] = await Promise.all([
      this.prisma.platformUserRoleAssignment.count({ where }),
      this.prisma.platformUserRoleAssignment.findMany({
        where,
        include: { platformUser: { include: { user: true } }, role: true },
        orderBy: { assignedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: rows.map((r) => ({
        assignmentId: r.id,
        platformUserId: r.platformUserId,
        fullName: r.platformUser.user.fullName,
        department: r.platformUser.department,
        roleId: r.roleId,
        roleName: r.role.name,
        isTemporary: r.isTemporary,
        expiresAt: r.expiresAt,
        assignedByName: r.assignedByName,
        assignedAt: r.assignedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async grantTemporaryAccess(dto: GrantTemporaryAccessDto, actorUserId: string) {
    return this.assign(dto.roleId, {
      platformUserId: dto.platformUserId,
      isTemporary: true,
      reason: dto.reason,
      approverName: dto.approverName,
      expiresAt: dto.expiresAt,
    }, actorUserId);
  }

  async listTemporaryAccess(query: { status?: string; page?: number; limit?: number }) {
    await this.authz.expireStaleAssignments();
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));

    const where: any = { isTemporary: true };
    if (query.status) where.status = query.status;

    const [total, rows] = await Promise.all([
      this.prisma.platformUserRoleAssignment.count({ where }),
      this.prisma.platformUserRoleAssignment.findMany({
        where,
        include: { platformUser: { include: { user: true } }, role: true },
        orderBy: { assignedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: rows.map((r) => ({
        id: r.id,
        platformUserId: r.platformUserId,
        fullName: r.platformUser.user.fullName,
        roleId: r.roleId,
        roleName: r.role.name,
        reason: r.reason,
        approverName: r.approverName,
        expiresAt: r.expiresAt,
        status: r.status,
        assignedByName: r.assignedByName,
        assignedAt: r.assignedAt,
        revokedAt: r.revokedAt,
        revokedByName: r.revokedByName,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async revokeTemporaryAccess(id: string, actorUserId: string) {
    const grant = await this.prisma.platformUserRoleAssignment.findUnique({ where: { id }, include: { platformUser: { include: { user: true } }, role: true } });
    if (!grant) throw new NotFoundException('Temporary access grant not found');
    if (grant.status !== 'Active') throw new BadRequestException('This grant is no longer active.');

    const actorName = await this.getActorName(actorUserId);
    await this.prisma.platformUserRoleAssignment.update({ where: { id }, data: { status: 'Revoked', revokedAt: new Date(), revokedByName: actorName } });
    await this.logEvent(actorUserId, 'Temporary Access Revoked', `Revoked ${grant.platformUser.user.fullName}'s temporary "${grant.role.name}" access.`, grant.roleId, 'PLATFORM_TEMP_ACCESS_REVOKED');
    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  // AUDIT
  // ---------------------------------------------------------------------------

  async getAuditHistory(query: { search?: string; eventType?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));

    const where: any = { eventCategory: AUDIT_CATEGORY };
    if (query.eventType) where.eventType = query.eventType;
    if (query.search) {
      where.OR = [
        { user: { contains: query.search, mode: 'insensitive' } },
        { details: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    ]);

    return { data: logs, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ---------------------------------------------------------------------------
  // INTERNAL HELPERS
  // ---------------------------------------------------------------------------

  private async assertExists(id: string) {
    const role = await this.prisma.platformRoleDefinition.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  private slugify(name: string): string {
    const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return `${base}-${Date.now().toString(36)}`;
  }

  private async getActorName(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user?.fullName || 'Platform Admin';
  }

  private async logEvent(actorUserId: string, action: string, details: string, entityId: string, eventType?: string, correlationId?: string) {
    const actorName = await this.getActorName(actorUserId);
    await this.auditLogsService.logEvent({
      userId: actorUserId,
      action,
      user: actorName,
      details,
      eventType,
      eventCategory: AUDIT_CATEGORY,
      entityType: 'PlatformRoleDefinition',
      entityId,
      correlationId,
    });
  }
}
