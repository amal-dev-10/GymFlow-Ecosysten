import { Injectable, BadRequestException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

// ============================================================
// CANONICAL PERMISSION KEYS — must match frontend PERMISSION_CATEGORIES
// ============================================================
const ALL_PERMISSION_KEYS = [
  // Authentication
  'auth.view_users', 'auth.invite_users', 'auth.manage_users', 'auth.manage_roles',
  'auth.manage_permissions', 'auth.view_audit', 'auth.manage_sessions', 'auth.manage_security',
  // Organization Management
  'org.view', 'org.create', 'org.update', 'org.manage_settings',
  'org.manage_branding', 'org.manage_subscription', 'org.manage_branches',
  // Subscriptions & Billing (plan the org is on, usage/limits, plan switching)
  'subscriptions.read', 'subscriptions.write',
  // Gym Branch Settings
  'gym.view', 'gym.create', 'gym.update', 'gym.delete',
  'gym.manage_settings', 'gym.manage_capacity', 'gym.manage_media',
  // Employee Management
  'employee.view', 'employee.create', 'employee.update', 'employee.delete',
  'employee.assign_roles', 'employee.transfer_branch', 'employee.manage_salary', 'employee.export',
  // Member Directory
  'member.view', 'member.create', 'member.update', 'member.delete',
  'member.import', 'member.export', 'member.manage_documents', 'member.manage_status',
  // Membership Management
  'membership.view_plans', 'membership.create_plans', 'membership.update_plans',
  'membership.activate_plans', 'membership.deactivate_plans', 'membership.purchase',
  'membership.renew', 'membership.freeze', 'membership.unfreeze',
  'membership.transfer', 'membership.cancel', 'membership.override',
  // Attendance & Occupancy
  'attendance.view', 'attendance.check_in', 'attendance.check_out', 'attendance.correct',
  'attendance.override', 'attendance.manage_qr', 'attendance.manage_settings',
  'attendance.export', 'attendance.view_occupancy',
  // Attendance Devices (biometric/QR/RFID hardware & simulators)
  'devices.view', 'devices.manage',
  // Workout Library
  'workout.view', 'workout.create', 'workout.assign', 'workout.update',
  'workout.delete', 'workout.manage_templates',
  // Diet Management
  'diet.view', 'diet.create', 'diet.assign', 'diet.update',
  'diet.delete', 'diet.manage_templates',
  // Billing & Payments
  'billing.view_invoices', 'billing.create_invoices', 'billing.record_payments',
  'billing.refund', 'billing.manage_taxes', 'billing.manage_discounts', 'billing.export',
  // Expense Management
  'expense.view', 'expense.create', 'expense.approve', 'expense.reject',
  'expense.manage_categories', 'expense.export',
  // Reports & Analytics
  'reports.view', 'reports.create', 'reports.export', 'reports.schedule',
  'reports.view_analytics', 'reports.manage_dashboards',
  // Notification Management
  'notification.view', 'notification.send',
  'notification.manage_templates', 'notification.manage_channels',
  // Settings & Security
  'settings.view', 'settings.update', 'settings.manage_attendance',
  'settings.manage_membership', 'settings.manage_notifications', 'settings.manage_integrations',
  // Security Audit Logs
  'audit.view', 'audit.export', 'audit.investigate', 'audit.view_security',
  // Integrations & Sync
  'integration.view', 'integration.create', 'integration.update',
  'integration.delete', 'integration.trigger',
  // Platform Administration
  'platform.view_tenants', 'platform.manage_tenants',
  'platform.view_system_logs', 'platform.configure_system',
];

// ============================================================
// SYSTEM ROLE DEFINITIONS — permission sets per role
// ============================================================
const SYSTEM_ROLE_DEFINITIONS = [
  {
    name: 'Organization Owner',
    description: 'Complete super-user access. Full control over all modules, branches, financial data, and staff configurations. This role cannot be modified.',
    category: 'Administration',
    permissions: ALL_PERMISSION_KEYS, // Full unrestricted access
  },
  {
    name: 'Gym Manager',
    description: 'Manages day-to-day operations across gym branches. Controls staff, members, memberships, attendance, and branch-level reports.',
    category: 'Operations',
    permissions: [
      'auth.view_users',
      'org.view',
      'gym.view', 'gym.update', 'gym.manage_settings', 'gym.manage_capacity', 'gym.manage_media',
      'employee.view', 'employee.create', 'employee.update', 'employee.assign_roles',
      'member.view', 'member.create', 'member.update', 'member.delete',
      'member.import', 'member.export', 'member.manage_documents', 'member.manage_status',
      'membership.view_plans', 'membership.purchase', 'membership.renew',
      'membership.freeze', 'membership.unfreeze', 'membership.cancel',
      'attendance.view', 'attendance.check_in', 'attendance.check_out', 'attendance.correct',
      'attendance.manage_qr', 'attendance.view_occupancy',
      'devices.view', 'devices.manage',
      'workout.view', 'workout.create', 'workout.assign', 'workout.update',
      'diet.view', 'diet.create', 'diet.assign', 'diet.update',
      'billing.view_invoices', 'billing.create_invoices', 'billing.record_payments',
      'expense.view', 'expense.create',
      'reports.view', 'reports.create', 'reports.export',
      'audit.view',
      'notification.view', 'notification.send',
    ],
  },
  {
    name: 'Receptionist',
    description: 'Front desk operations: member check-ins, basic membership handling, and billing receipt generation.',
    category: 'Operations',
    permissions: [
      'gym.view',
      'member.view', 'member.create', 'member.update', 'member.manage_documents', 'member.manage_status',
      'membership.view_plans', 'membership.purchase', 'membership.renew',
      'attendance.view', 'attendance.check_in', 'attendance.check_out',
      'attendance.manage_qr', 'attendance.view_occupancy',
      'devices.view',
      'billing.view_invoices', 'billing.create_invoices', 'billing.record_payments',
      'notification.view',
    ],
  },
  {
    name: 'Trainer',
    description: 'Manages workout plans and member progress. Leads training sessions and tracks personal fitness metrics.',
    category: 'Fitness',
    permissions: [
      'gym.view',
      'member.view',
      'membership.view_plans',
      'attendance.view',
      'workout.view', 'workout.create', 'workout.assign', 'workout.update', 'workout.manage_templates',
      'diet.view', 'diet.create', 'diet.assign', 'diet.update',
    ],
  },
  {
    name: 'Dietitian',
    description: 'Manages nutrition plans and dietary consultations. Tracks body composition metrics and health goals.',
    category: 'Fitness',
    permissions: [
      'member.view',
      'membership.view_plans',
      'workout.view',
      'diet.view', 'diet.create', 'diet.assign', 'diet.update', 'diet.manage_templates',
    ],
  },
  {
    name: 'Accountant',
    description: 'Manages invoices, expense tracking, payroll calculations, and financial reporting across branches.',
    category: 'Finance',
    permissions: [
      'member.view',
      'membership.view_plans',
      'billing.view_invoices', 'billing.create_invoices', 'billing.record_payments',
      'billing.refund', 'billing.manage_taxes', 'billing.manage_discounts', 'billing.export',
      'expense.view', 'expense.create', 'expense.approve', 'expense.reject',
      'expense.manage_categories', 'expense.export',
      'reports.view', 'reports.create', 'reports.export', 'reports.schedule',
    ],
  },
  {
    name: 'Yoga Instructor',
    description: 'Conducts Yoga sessions, manages class schedules, and monitors class participation.',
    category: 'Fitness',
    permissions: [
      'member.view',
      'workout.view', 'workout.create', 'workout.assign', 'workout.update',
      'attendance.view', 'attendance.view_occupancy',
    ],
  },
  {
    name: 'Zumba Instructor',
    description: 'Conducts Zumba sessions, manages choreography schedules, and handles class enrollment.',
    category: 'Fitness',
    permissions: [
      'member.view',
      'workout.view', 'workout.create', 'workout.assign', 'workout.update',
      'attendance.view', 'attendance.view_occupancy',
    ],
  },
];

@Injectable()
export class RolesService implements OnModuleInit {
  constructor(private prisma: DatabaseService) {}

  private async getActorName(userId?: string): Promise<string> {
    if (!userId) return 'System';
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user?.fullName || user?.phoneNumber || 'Staff Member';
  }

  async onModuleInit() {
    await this.seedDefaultRoles();
  }

  // ============================================================
  // SEED / SYNC system roles with canonical permission sets
  // Always force-syncs permissions (not a one-time skip).
  // ============================================================
  async seedDefaultRoles() {
    for (const roleDef of SYSTEM_ROLE_DEFINITIONS) {
      // Find or create system role (organizationId = null marks system roles)
      let role = await this.prisma.role.findFirst({
        where: { name: roleDef.name, organizationId: null },
      });

      if (!role) {
        role = await this.prisma.role.create({
          data: {
            name: roleDef.name,
            description: roleDef.description,
            category: roleDef.category,
            organizationId: null,
            gymScope: 'all',
          },
        });
      } else {
        // Sync metadata updates (description/category may have changed)
        role = await this.prisma.role.update({
          where: { id: role.id },
          data: { description: roleDef.description, category: roleDef.category },
        });
      }

      // Always force-sync permissions: wipe old set and re-apply canonical definition
      await this.prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

      for (const permStr of roleDef.permissions) {
        const perm = await this.findOrCreatePermissionDirect(permStr);
        if (perm) {
          try {
            await this.prisma.rolePermission.create({
              data: { roleId: role.id, permissionId: perm.id },
            });
          } catch (e: any) {
            if (e.code !== 'P2002') throw e; // ignore duplicate key
          }
        }
      }
    }
  }

  // Public endpoint: re-sync all system role permissions on demand
  async syncSystemRoles() {
    await this.seedDefaultRoles();
    return {
      success: true,
      message: `Synced ${SYSTEM_ROLE_DEFINITIONS.length} system roles with canonical permission sets.`,
      roles: SYSTEM_ROLE_DEFINITIONS.map((r) => ({
        name: r.name,
        permissionCount: r.permissions.length,
      })),
    };
  }

  // Aggregated stats for RBAC dashboard
  async getStats(orgId: string) {
    const [allRoles, employees, customRoles, systemRoles] = await Promise.all([
      this.prisma.role.findMany({
        where: { OR: [{ organizationId: orgId }, { organizationId: null }] },
        include: { rolePermissions: true, organizationUsers: { where: { organizationId: orgId } } },
      }),
      this.prisma.organizationUser.count({ where: { organizationId: orgId } }),
      this.prisma.role.count({ where: { organizationId: orgId } }),
      this.prisma.role.count({ where: { organizationId: null } }),
    ]);

    const totalPermissionNodes = ALL_PERMISSION_KEYS.length;
    const permissionGroups = [...new Set(ALL_PERMISSION_KEYS.map((k) => k.split('.')[0]))].length;

    return {
      totalRoles: allRoles.length,
      systemRoles,
      customRoles,
      activeUsers: employees,
      permissionGroups,
      totalPermissionNodes,
      activeOverrides: 0, // overrides are managed separately
    };
  }

  // Helper to resolve or create a single permission by dot-notation string
  private async findOrCreatePermissionDirect(permStr: string) {
    const dotIndex = permStr.indexOf('.');
    if (dotIndex === -1) return null;
    const resource = permStr.substring(0, dotIndex);
    const action = permStr.substring(dotIndex + 1); // preserves underscores e.g. 'view_invoices'

    let perm = await this.prisma.permission.findUnique({
      where: { resource_action: { resource, action } },
    });
    if (!perm) {
      try {
        perm = await this.prisma.permission.create({ data: { resource, action } });
      } catch (e: any) {
        if (e.code === 'P2002') {
          perm = await this.prisma.permission.findUnique({
            where: { resource_action: { resource, action } },
          });
        } else {
          throw e;
        }
      }
    }
    return perm;
  }

  // Helper to resolve/create database permissions (used in transactions)
  private async findOrCreatePermission(tx: any, permStr: string) {
    const dotIndex = permStr.indexOf('.');
    if (dotIndex === -1) return null;
    const resource = permStr.substring(0, dotIndex);
    const action = permStr.substring(dotIndex + 1);

    let perm = await tx.permission.findUnique({
      where: { resource_action: { resource, action } },
    });
    if (!perm) {
      perm = await tx.permission.create({ data: { resource, action } });
    }
    return perm;
  }

  // Get all roles for the active organization
  async getRoles(orgId: string) {
    const dbRoles = await this.prisma.role.findMany({
      where: {
        OR: [
          { organizationId: orgId },
          { organizationId: null }, // System global roles
        ],
      },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
        organizationUsers: {
          where: { organizationId: orgId },
        },
      },
      orderBy: [
        { organizationId: 'asc' }, // system roles (null) first
        { name: 'asc' },
      ],
    });

    return dbRoles.map((role) => {
      const isSystem = !role.organizationId;
      return {
        id: role.id,
        name: role.name,
        description: role.description || '',
        category: role.category || 'Custom',
        isSystem,
        usersCount: role.organizationUsers.length,
        permissions: role.rolePermissions.map(
          (rp) => `${rp.permission.resource}.${rp.permission.action}`,
        ),
        createdDate: role.createdAt.toISOString().split('T')[0],
        status: 'active',
        gymScope: this.parseGymScope(role.gymScope),
      };
    });
  }

  // Get specific role details (includes assigned users)
  async getRole(orgId: string, roleId: string) {
    const role = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        OR: [{ organizationId: orgId }, { organizationId: null }],
      },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
        organizationUsers: {
          where: { organizationId: orgId },
          include: { user: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Resolve the Employee record (if any) behind each assigned user so the
    // client can unassign them: removeUserFromRole() is keyed by employeeId,
    // not organizationUser id. Users without an employee record (e.g. the
    // Organization Owner) get employeeId = null and can't be revoked.
    const assignedUserIds = role.organizationUsers.map((ou) => ou.userId);
    const employees = assignedUserIds.length
      ? await this.prisma.employee.findMany({
          where: { organizationId: orgId, userId: { in: assignedUserIds } },
          select: { id: true, userId: true },
        })
      : [];
    const employeeIdByUserId = new Map(employees.map((e) => [e.userId, e.id]));

    const isSystem = !role.organizationId;
    return {
      id: role.id,
      name: role.name,
      description: role.description || '',
      category: role.category || 'Custom',
      isSystem,
      usersCount: role.organizationUsers.length,
      permissions: role.rolePermissions.map(
        (rp) => `${rp.permission.resource}.${rp.permission.action}`,
      ),
      createdDate: role.createdAt.toISOString().split('T')[0],
      status: 'active',
      gymScope: this.parseGymScope(role.gymScope),
      assignedUsers: role.organizationUsers.map((ou) => ({
        id: ou.id,
        employeeId: employeeIdByUserId.get(ou.userId) || null,
        name: ou.user.fullName || '',
        phone: ou.user.phoneNumber || '',
        isActive: ou.isActive,
      })),
    };
  }

  // Create a custom role
  async createRole(orgId: string, dto: CreateRoleDto, actorUserId?: string) {
    const actorName = await this.getActorName(actorUserId);
    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          organizationId: orgId,
          name: dto.name,
          description: dto.description,
          category: dto.category || 'Custom',
          gymScope: dto.gymScope ? this.stringifyGymScope(dto.gymScope) : 'all',
        },
      });

      if (dto.permissions && dto.permissions.length > 0) {
        for (const permStr of dto.permissions) {
          const perm = await this.findOrCreatePermission(tx, permStr);
          if (perm) {
            await tx.rolePermission.create({
              data: { roleId: role.id, permissionId: perm.id },
            });
          }
        }
      }

      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId: actorUserId,
          action: 'Role Created',
          user: actorName,
          details: `Custom role '${dto.name}' created with ${dto.permissions?.length || 0} permissions.`,
          eventType: 'ROLE_CREATED',
          eventCategory: 'Authorization',
          entityType: 'Role',
          entityId: role.id,
        },
      });

      return role;
    });
  }

  // Update a custom role (system roles are protected — organizationId must match)
  async updateRole(orgId: string, roleId: string, dto: UpdateRoleDto, actorUserId?: string) {
    const existingRole = await this.prisma.role.findFirst({
      where: { id: roleId, organizationId: orgId }, // won't match system roles (null orgId)
    });

    if (!existingRole) {
      throw new NotFoundException(`Custom role with ID ${roleId} not found or is system-protected`);
    }

    const actorName = await this.getActorName(actorUserId);
    return this.prisma.$transaction(async (tx) => {
      const updatedRole = await tx.role.update({
        where: { id: roleId },
        data: {
          name: dto.name,
          description: dto.description,
          category: dto.category,
          gymScope: dto.gymScope ? this.stringifyGymScope(dto.gymScope) : undefined,
        },
      });

      if (dto.permissions !== undefined) {
        await tx.rolePermission.deleteMany({ where: { roleId } });
        for (const permStr of dto.permissions) {
          const perm = await this.findOrCreatePermission(tx, permStr);
          if (perm) {
            await tx.rolePermission.create({
              data: { roleId, permissionId: perm.id },
            });
          }
        }
      }

      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId: actorUserId,
          action: 'Role Updated',
          user: actorName,
          details: `Updated permissions and configurations for role '${dto.name || existingRole.name}'.`,
          eventType: 'ROLE_UPDATED',
          eventCategory: 'Authorization',
          entityType: 'Role',
          entityId: roleId,
        },
      });

      return updatedRole;
    });
  }

  // Delete a custom role
  async deleteRole(orgId: string, roleId: string, actorUserId?: string) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, organizationId: orgId },
      include: { organizationUsers: true },
    });

    if (!role) {
      throw new NotFoundException(`Custom role with ID ${roleId} not found`);
    }

    if (role.organizationUsers.length > 0) {
      throw new BadRequestException(
        `Cannot delete role '${role.name}' as it has ${role.organizationUsers.length} active users assigned.`,
      );
    }

    const actorName = await this.getActorName(actorUserId);
    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });
      await tx.role.delete({ where: { id: roleId } });
      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId: actorUserId,
          action: 'Role Deleted',
          user: actorName,
          details: `Role '${role.name}' has been permanently deleted.`,
          eventType: 'ROLE_DELETED',
          eventCategory: 'Authorization',
          entityType: 'Role',
          entityId: roleId,
        },
      });
    });

    return { success: true };
  }

  // Assign staff members to a role
  async assignUsersToRole(orgId: string, roleId: string, employeeIds: string[], actorUserId?: string) {
    const employees = await this.prisma.employee.findMany({
      where: { id: { in: employeeIds }, organizationId: orgId },
    });

    if (employees.length === 0) {
      throw new BadRequestException('No valid employees found for assignment');
    }

    const userIds = employees.map((emp) => emp.userId);
    const actorName = await this.getActorName(actorUserId);

    return this.prisma.$transaction(async (tx) => {
      await tx.organizationUser.updateMany({
        where: { userId: { in: userIds }, organizationId: orgId },
        data: { roleId },
      });

      const role = await tx.role.findUnique({ where: { id: roleId } });

      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId: actorUserId,
          action: 'Users Assigned',
          user: actorName,
          details: `Assigned ${employees.length} employee(s) to '${role?.name}' role.`,
          eventType: 'ROLE_USERS_ASSIGNED',
          eventCategory: 'Authorization',
          entityType: 'Role',
          entityId: roleId,
        },
      });

      return { success: true, assignedCount: employees.length };
    });
  }

  // Revoke custom role and fall back to Trainer or first available role
  async removeUserFromRole(orgId: string, employeeId: string, actorUserId?: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId: orgId },
      include: { user: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const actorName = await this.getActorName(actorUserId);
    return this.prisma.$transaction(async (tx) => {
      let defaultRole = await tx.role.findFirst({
        where: {
          name: 'Trainer',
          OR: [{ organizationId: orgId }, { organizationId: null }],
        },
      });

      if (!defaultRole) {
        defaultRole = await tx.role.findFirst({
          where: { OR: [{ organizationId: orgId }, { organizationId: null }] },
        });
      }

      if (!defaultRole) {
        throw new BadRequestException('No default fallback role found in organization');
      }

      await tx.organizationUser.update({
        where: {
          userId_organizationId: { userId: employee.userId, organizationId: orgId },
        },
        data: { roleId: defaultRole.id },
      });

      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId: actorUserId,
          action: 'User Reassigned',
          user: actorName,
          details: `Revoked custom role from '${employee.user.fullName}' and reset to '${defaultRole.name}'.`,
          eventType: 'ROLE_USER_REASSIGNED',
          eventCategory: 'Authorization',
          entityType: 'Employee',
          entityId: employeeId,
        },
      });

      return { success: true };
    });
  }

  // Fetch recent system audit logs
  async getAuditLogs(orgId: string, eventCategory?: string) {
    const where: any = { organizationId: orgId };
    if (eventCategory) {
      where.eventCategory = eventCategory;
    }
    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return logs.map((log) => ({
      id: log.id,
      timestamp:
        log.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
        ' · ' +
        log.createdAt.toLocaleDateString(),
      createdAt: log.createdAt,
      action: log.action,
      user: log.user,
      details: log.details,
      eventCategory: log.eventCategory,
      entityType: log.entityType,
      entityId: log.entityId,
    }));
  }

  // Security/IAM-scoped audit trail powering the Roles & Permissions
  // "Security Logs" tab: role & permission changes, user-access changes, and
  // authentication/session events. Unlike getAuditLogs() above (capped at 20
  // and spanning every category — fine for the dashboard's recent-activity
  // pulse) this is scoped to security categories and paginated server-side so
  // the log is both accurate to its name and complete.
  private static SECURITY_LOG_CATEGORIES = ['Authorization', 'Security', 'Authentication', 'Session'];

  async getSecurityLogs(orgId: string, page = 1, limit = 15) {
    const where: any = {
      organizationId: orgId,
      eventCategory: { in: RolesService.SECURITY_LOG_CATEGORIES },
    };
    const currentPage = Math.max(1, page);
    const skip = (currentPage - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs.map((log) => ({
        id: log.id,
        timestamp:
          log.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
          ' · ' +
          log.createdAt.toLocaleDateString(),
        action: log.action,
        user: log.user,
        details: log.details,
        eventCategory: log.eventCategory,
      })),
      total,
      page: currentPage,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  // Get list of assignable employees with their current role
  async getAssignableEmployees(orgId: string) {
    const employees = await this.prisma.employee.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          include: {
            organizationUsers: {
              where: { organizationId: orgId },
              include: { role: true, roles: true },
            },
          },
        },
        employeeGymAssignments: {
          include: { gym: true },
        },
      },
    });

    return employees.map((emp) => {
      const orgUser = emp.user.organizationUsers[0];
      const gyms = emp.employeeGymAssignments.map((ega) => ega.gym.name);
      
      const allRoles = orgUser ? [orgUser.role, ...(orgUser.roles || [])] : [];
      const roleNames = allRoles.map(r => r.name);

      return {
        id: emp.id,
        name: emp.user.fullName,
        phone: emp.user.phoneNumber || '',
        gyms,
        roleId: orgUser?.roleId || '',
        roleName: orgUser?.role?.name || '',
        roleNames,
        status: orgUser?.isActive ? 'active' : 'inactive',
        assignedDate: emp.createdAt.toISOString().split('T')[0],
      };
    });
  }

  // Create custom audit log
  async createAuditLog(
    orgId: string,
    action: string,
    details: string,
    user?: string,
    eventType?: string,
    eventCategory?: string,
    metadata?: any,
  ) {
    return this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        action,
        user: user || 'System',
        details,
        eventType: eventType || null,
        eventCategory: eventCategory || null,
        metadata: metadata || {},
      },
    });
  }

  private parseGymScope(scopeStr: string): 'all' | string[] {
    if (scopeStr === 'all') return 'all';
    return scopeStr.split(',');
  }

  private stringifyGymScope(scope: 'all' | string[]): string {
    if (scope === 'all') return 'all';
    return scope.join(',');
  }
}
