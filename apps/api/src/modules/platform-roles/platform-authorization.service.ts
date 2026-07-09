import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

export interface EffectivePermission {
  key: string;
  effect: 'ALLOW' | 'DENY';
  label: string;
  categoryKey: string;
  isSensitive: boolean;
  sourceRoleIds: string[];
  sourceRoleNames: string[];
}

const SUPER_ADMIN_SLUG = 'super-administrator';

/**
 * PLT-008 authorization engine: the single place that turns a Platform
 * User's role assignments into a concrete set of effective permissions.
 * Evaluation is AWS-IAM-style: explicit DENY (from any assigned or inherited
 * role) always wins over ALLOW from any other role; anything unmentioned is
 * default-deny. Future modules should call hasPermission()/getEffectivePermissions()
 * instead of checking role names directly.
 */
@Injectable()
export class PlatformAuthorizationService {
  constructor(
    private prisma: DatabaseService,
    private auditLogsService: AuditLogsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Lazy expiration (no cron in this codebase - same convention as
  // PlatformAdminUser.lockedUntil). Called by every read path that touches
  // role assignments so stale temporary grants never leak into an evaluation.
  // ---------------------------------------------------------------------------
  async expireStaleAssignments(): Promise<void> {
    const stale = await this.prisma.platformUserRoleAssignment.findMany({
      where: { status: 'Active', expiresAt: { lt: new Date() } },
      include: { role: true, platformUser: { include: { user: true } } },
    });
    for (const row of stale) {
      await this.prisma.platformUserRoleAssignment.update({ where: { id: row.id }, data: { status: 'Expired' } });
      await this.auditLogsService.logEvent({
        userId: row.platformUser.userId,
        action: 'Temporary Access Expired',
        user: 'System',
        details: `Temporary "${row.role.name}" access for ${row.platformUser.user.fullName} expired.`,
        eventType: 'PLATFORM_TEMP_ACCESS_EXPIRED',
        eventCategory: 'Roles & Permissions',
        entityType: 'PlatformUserRoleAssignment',
        entityId: row.id,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Inheritance expansion
  // ---------------------------------------------------------------------------

  /** All roles reachable from the given role ids via inheritance, including the roots themselves. */
  private async expandInheritance(roleIds: string[]): Promise<Set<string>> {
    const visited = new Set<string>(roleIds);
    let frontier = [...roleIds];
    while (frontier.length > 0) {
      const edges = await this.prisma.platformRoleInheritance.findMany({ where: { roleId: { in: frontier } } });
      const next: string[] = [];
      for (const edge of edges) {
        if (!visited.has(edge.inheritsRoleId)) {
          visited.add(edge.inheritsRoleId);
          next.push(edge.inheritsRoleId);
        }
      }
      frontier = next;
    }
    return visited;
  }

  /** Cycle-safe check used before saving a new inheritance edge roleId -> inheritsRoleId. */
  async wouldCreateCycle(roleId: string, inheritsRoleId: string): Promise<boolean> {
    if (roleId === inheritsRoleId) return true;
    const reachable = await this.expandInheritance([inheritsRoleId]);
    return reachable.has(roleId);
  }

  // ---------------------------------------------------------------------------
  // Evaluation
  // ---------------------------------------------------------------------------

  async getEffectivePermissionsForRoles(roleIds: string[]): Promise<EffectivePermission[]> {
    const fullRoleSet = await this.expandInheritance(roleIds);
    const roleIdList = Array.from(fullRoleSet);

    const [directPerms, groupAssignments, roles] = await Promise.all([
      this.prisma.platformRolePermission.findMany({
        where: { roleId: { in: roleIdList } },
        include: { permission: { include: { category: true } } },
      }),
      this.prisma.platformRoleGroupAssignment.findMany({
        where: { roleId: { in: roleIdList } },
        include: { group: { include: { items: { include: { permission: { include: { category: true } } } } } } },
      }),
      this.prisma.platformRoleDefinition.findMany({ where: { id: { in: roleIdList } } }),
    ]);

    const roleNameById = new Map(roles.map((r) => [r.id, r.name]));
    const byPermission = new Map<string, EffectivePermission>();

    const apply = (permission: { key: string; label: string; categoryKey: string; isSensitive: boolean }, effect: 'ALLOW' | 'DENY', roleId: string) => {
      const existing = byPermission.get(permission.key);
      if (!existing) {
        byPermission.set(permission.key, {
          key: permission.key,
          effect,
          label: permission.label,
          categoryKey: permission.categoryKey,
          isSensitive: permission.isSensitive,
          sourceRoleIds: [roleId],
          sourceRoleNames: [roleNameById.get(roleId) || roleId],
        });
        return;
      }
      if (!existing.sourceRoleIds.includes(roleId)) {
        existing.sourceRoleIds.push(roleId);
        existing.sourceRoleNames.push(roleNameById.get(roleId) || roleId);
      }
      // DENY always wins, regardless of which role or group contributed it.
      if (effect === 'DENY') existing.effect = 'DENY';
    };

    for (const rp of directPerms) {
      apply(rp.permission, rp.effect, rp.roleId);
    }
    for (const ga of groupAssignments) {
      for (const item of ga.group.items) {
        apply(item.permission, ga.effect, ga.roleId);
      }
    }

    return Array.from(byPermission.values());
  }

  async getEffectivePermissionsForUser(platformUserId: string): Promise<EffectivePermission[]> {
    await this.expireStaleAssignments();
    const assignments = await this.prisma.platformUserRoleAssignment.findMany({
      where: { platformUserId, status: 'Active' },
    });
    if (assignments.length === 0) return [];
    return this.getEffectivePermissionsForRoles(assignments.map((a) => a.roleId));
  }

  async hasPermission(platformUserId: string, key: string): Promise<boolean> {
    const perms = await this.getEffectivePermissionsForUser(platformUserId);
    return perms.some((p) => p.key === key && p.effect === 'ALLOW');
  }

  // ---------------------------------------------------------------------------
  // Validation rules
  // ---------------------------------------------------------------------------

  /** True if revoking `platformUserId`'s assignment to `roleId` would leave zero active Super Administrators. */
  async isLastActiveSuperAdmin(roleId: string, platformUserId: string): Promise<boolean> {
    const role = await this.prisma.platformRoleDefinition.findUnique({ where: { id: roleId } });
    if (!role || role.slug !== SUPER_ADMIN_SLUG) return false;
    const activeCount = await this.prisma.platformUserRoleAssignment.count({
      where: { roleId, status: 'Active', platformUserId: { not: platformUserId } },
    });
    return activeCount === 0;
  }

  /** True if deleting this role entirely would leave zero active Super Administrators (only relevant for the Super Administrator role itself). */
  async wouldRemoveLastSuperAdminRole(roleId: string): Promise<boolean> {
    const role = await this.prisma.platformRoleDefinition.findUnique({ where: { id: roleId } });
    if (!role || role.slug !== SUPER_ADMIN_SLUG) return false;
    return true; // The Super Administrator role itself is never deletable while it exists (also isSystem-protected).
  }
}
