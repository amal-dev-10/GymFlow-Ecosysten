import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { BulkUpdateDto } from './dto/bulk-update.dto';

@Injectable()
export class OrgUsersService {
  constructor(private prisma: DatabaseService) {}

  // Fetch dashboard stats for the organization
  async getStats(orgId: string) {
    const totalUsers = await this.prisma.organizationUser.count({
      where: { organizationId: orgId },
    });

    const activeUsers = await this.prisma.organizationUser.count({
      where: { organizationId: orgId, isActive: true },
    });

    const pendingInvitations = await this.prisma.organizationInvitation.count({
      where: { organizationId: orgId, status: 'Pending' },
    });

    const rolesInUseResult = await this.prisma.organizationUser.groupBy({
      by: ['roleId'],
      where: { organizationId: orgId },
    });

    return {
      totalUsers,
      activeUsers,
      pendingInvitations,
      rolesInUse: rolesInUseResult.length,
    };
  }

  // List all users in the organization
  async getUsers(orgId: string) {
    const orgUsers = await this.prisma.organizationUser.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          include: {
            employees: {
              where: { organizationId: orgId },
              include: {
                employeeGymAssignments: {
                  include: { gym: true },
                },
              },
            },
          },
        },
        role: true,
        roles: true,
      },
    });

    return orgUsers.map((ou) => {
      const employee = ou.user.employees[0];
      const gyms = employee
        ? employee.employeeGymAssignments.map((ega) => ({
            id: ega.gym.id,
            name: ega.gym.name,
          }))
        : [];

      const allRoles = [ou.role, ...(ou.roles || [])];
      const uniqueRolesMap = new Map();
      allRoles.forEach(r => uniqueRolesMap.set(r.id, r));
      const uniqueRoles = Array.from(uniqueRolesMap.values());

      return {
        id: ou.user.id,
        name: ou.user.fullName,
        phone: ou.user.phoneNumber,
        email: ou.user.email || '',
        role: {
          id: ou.role.id,
          name: ou.role.name,
          category: ou.role.category,
          isSystem: !ou.role.organizationId,
        },
        roles: uniqueRoles.map(r => ({
          id: r.id,
          name: r.name,
          category: r.category,
          isSystem: !r.organizationId,
        })),
        gyms,
        status: ou.isActive ? 'active' : 'inactive',
        joinedDate: ou.user.createdAt.toISOString().split('T')[0],
        lastActive: 'Active recently',
      };
    });
  }

  // Get specific user details
  async getUserDetails(orgId: string, userId: string) {
    const ou = await this.prisma.organizationUser.findFirst({
      where: { organizationId: orgId, userId },
      include: {
        user: {
          include: {
            employees: {
              where: { organizationId: orgId },
              include: {
                employeeGymAssignments: {
                  include: { gym: true },
                },
              },
            },
          },
        },
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
        roles: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    if (!ou) {
      throw new NotFoundException('User not found in this organization');
    }

    const employee = ou.user.employees[0];
    const gyms = employee
      ? employee.employeeGymAssignments.map((ega) => ({
          id: ega.gym.id,
          name: ega.gym.name,
        }))
      : [];

    const allRoles = [ou.role, ...(ou.roles || [])];
    const uniqueRolesMap = new Map();
    allRoles.forEach(r => uniqueRolesMap.set(r.id, r));
    const uniqueRoles = Array.from(uniqueRolesMap.values());

    const permissionSet = new Set<string>();
    uniqueRoles.forEach(r => {
      r.rolePermissions.forEach((rp: any) => {
        permissionSet.add(`${rp.permission.resource}.${rp.permission.action}`);
      });
    });
    const permissions = Array.from(permissionSet);

    // Fetch user recent audit logs
    const logs = await this.prisma.auditLog.findMany({
      where: {
        organizationId: orgId,
        details: { contains: ou.user.fullName },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      id: ou.user.id,
      name: ou.user.fullName,
      phone: ou.user.phoneNumber,
      email: ou.user.email || '',
      role: {
        id: ou.role.id,
        name: ou.role.name,
        category: ou.role.category,
        isSystem: !ou.role.organizationId,
        description: ou.role.description || '',
      },
      roles: uniqueRoles.map(r => ({
        id: r.id,
        name: r.name,
        category: r.category,
        isSystem: !r.organizationId,
        description: r.description || '',
      })),
      gyms,
      status: ou.isActive ? 'active' : 'inactive',
      joinedDate: ou.user.createdAt.toISOString().split('T')[0],
      lastActive: 'Active recently',
      permissions,
      activityLog: logs.map(l => ({
        id: l.id,
        timestamp: l.createdAt.toLocaleDateString() + ' ' + l.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        action: l.action,
        user: l.user,
        details: l.details,
      })),
    };
  }

  // Change user role
  async changeUserRole(orgId: string, userId: string, newRoleId?: string, newRoleIds?: string[]) {
    const roleIdsToAssign = newRoleIds && newRoleIds.length > 0
      ? newRoleIds
      : newRoleId
      ? [newRoleId]
      : [];

    if (roleIdsToAssign.length === 0) {
      throw new BadRequestException('At least one role must be assigned');
    }

    const ou = await this.prisma.organizationUser.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
      include: { role: true, user: true, roles: true },
    });

    if (!ou) {
      throw new NotFoundException('User not found in organization');
    }

    const validRoles = await this.prisma.role.findMany({
      where: {
        id: { in: roleIdsToAssign },
        OR: [{ organizationId: orgId }, { organizationId: null }],
      },
    });

    if (validRoles.length !== roleIdsToAssign.length) {
      throw new NotFoundException('One or more roles not found');
    }

    const primaryRoleId = roleIdsToAssign[0];
    const primaryRole = validRoles.find(r => r.id === primaryRoleId);

    // Safeguard: Prevent removing the last owner
    const wasOwner = ou.role.name === 'Organization Owner' || ou.roles.some(r => r.name === 'Organization Owner');
    const isStillOwner = validRoles.some(r => r.name === 'Organization Owner');
    if (wasOwner && !isStillOwner) {
      await this.verifyActiveOwnerExists(orgId, userId);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.organizationUser.update({
        where: { userId_organizationId: { userId, organizationId: orgId } },
        data: {
          roleId: primaryRoleId,
          roles: {
            set: roleIdsToAssign.map(id => ({ id })),
          },
        },
      });

      const roleNames = validRoles.map(r => r.name).join(', ');
      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          action: 'Role Changed',
          user: 'Marcus Vance',
          details: `Changed roles of user '${ou.user.fullName}' from '${ou.role.name}' to: ${roleNames}.`,
          eventType: 'ROLE_CHANGED',
          eventCategory: 'Authorization',
          entityType: 'User',
          entityId: userId,
          metadata: { roleIds: roleIdsToAssign, roleNames },
        },
      });

      return updated;
    });
  }

  // Assign gyms to user
  async assignUserGyms(orgId: string, userId: string, gymIds: string[]) {
    // Find or create employee entry
    let employee = await this.prisma.employee.findFirst({
      where: { userId, organizationId: orgId },
    });

    if (!employee) {
      employee = await this.prisma.employee.create({
        data: {
          organizationId: orgId,
          userId,
        },
      });
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    return this.prisma.$transaction(async (tx) => {
      // Clear current assignments
      await tx.employeeGymAssignment.deleteMany({
        where: { employeeId: employee.id },
      });

      // Insert new assignments
      for (const gymId of gymIds) {
        await tx.employeeGymAssignment.create({
          data: {
            employeeId: employee.id,
            gymId,
            isPrimary: false,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          action: 'Gym Access Changed',
          user: 'Marcus Vance',
          details: `Updated gym branch access assignments for user '${user?.fullName || 'Employee'}'.`,
          eventType: 'GYM_ACCESS_CHANGED',
          eventCategory: 'Authorization',
          entityType: 'User',
          entityId: userId,
          metadata: { gymIds },
        },
      });

      return { success: true };
    });
  }

  // Toggle user activation status
  async toggleUserStatus(orgId: string, userId: string, isActive: boolean) {
    const ou = await this.prisma.organizationUser.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
      include: { role: true, user: true },
    });

    if (!ou) {
      throw new NotFoundException('User not found in organization');
    }

    // Safeguard: Check last owner
    if (!isActive && ou.role.name === 'Organization Owner') {
      await this.verifyActiveOwnerExists(orgId, userId);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.organizationUser.update({
        where: { userId_organizationId: { userId, organizationId: orgId } },
        data: { isActive },
      });

      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          action: isActive ? 'User Activated' : 'User Deactivated',
          user: 'Marcus Vance',
          details: `${isActive ? 'Activated' : 'Deactivated'} workspace access for user '${ou.user.fullName}'.`,
          eventType: isActive ? 'ACCOUNT_ACTIVATED' : 'ACCOUNT_DEACTIVATED',
          eventCategory: 'Security',
          entityType: 'User',
          entityId: userId,
          metadata: { isActive },
        },
      });

      return updated;
    });
  }

  // Remove user from organization
  async removeUser(orgId: string, userId: string) {
    const ou = await this.prisma.organizationUser.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
      include: { role: true, user: true },
    });

    if (!ou) {
      throw new NotFoundException('User not found in organization');
    }

    // Safeguard: Check last owner
    if (ou.role.name === 'Organization Owner') {
      await this.verifyActiveOwnerExists(orgId, userId);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.organizationUser.delete({
        where: { userId_organizationId: { userId, organizationId: orgId } },
      });

      // Also clean up employee assignments if they exist
      const employee = await tx.employee.findFirst({
        where: { userId, organizationId: orgId },
      });

      if (employee) {
        await tx.employeeGymAssignment.deleteMany({
          where: { employeeId: employee.id },
        });
        await tx.employee.delete({
          where: { id: employee.id },
        });
      }

      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          action: 'User Removed',
          user: 'Marcus Vance',
          details: `Removed user '${ou.user.fullName}' from the organization.`,
          eventType: 'USER_REMOVED',
          eventCategory: 'Security',
          entityType: 'User',
          entityId: userId,
        },
      });

      return { success: true };
    });
  }

  // Bulk update users
  async bulkUpdate(orgId: string, dto: BulkUpdateDto) {
    if (dto.userIds.length === 0) {
      throw new BadRequestException('userIds list cannot be empty');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const userId of dto.userIds) {
        // Update Role if provided
        const roleIdsToAssign = dto.roleIds && dto.roleIds.length > 0
          ? dto.roleIds
          : dto.roleId
          ? [dto.roleId]
          : null;

        if (roleIdsToAssign) {
          const ou = await tx.organizationUser.findUnique({
            where: { userId_organizationId: { userId, organizationId: orgId } },
            include: { role: true, roles: true },
          });

          if (ou) {
            // Owner check
            const wasOwner = ou.role.name === 'Organization Owner' || ou.roles.some(r => r.name === 'Organization Owner');
            const validRoles = await tx.role.findMany({
              where: {
                id: { in: roleIdsToAssign },
                OR: [{ organizationId: orgId }, { organizationId: null }],
              },
            });
            const isStillOwner = validRoles.some(r => r.name === 'Organization Owner');
            
            if (wasOwner && !isStillOwner) {
              const activeOwnersCount = await tx.organizationUser.count({
                where: {
                  organizationId: orgId,
                  role: { name: 'Organization Owner' },
                  isActive: true,
                  userId: { not: userId },
                },
              });
              if (activeOwnersCount === 0) {
                // Skip changing the role of this owner to prevent locking out
                continue;
              }
            }

            await tx.organizationUser.update({
              where: { userId_organizationId: { userId, organizationId: orgId } },
              data: {
                roleId: roleIdsToAssign[0],
                roles: {
                  set: roleIdsToAssign.map(id => ({ id })),
                },
              },
            });
          }
        }

        // Update Gym access if provided
        if (dto.gymIds) {
          let employee = await tx.employee.findFirst({
            where: { userId, organizationId: orgId },
          });

          if (!employee) {
            employee = await tx.employee.create({
              data: { organizationId: orgId, userId },
            });
          }

          await tx.employeeGymAssignment.deleteMany({
            where: { employeeId: employee.id },
          });

          for (const gymId of dto.gymIds) {
            await tx.employeeGymAssignment.create({
              data: { employeeId: employee.id, gymId },
            });
          }
        }
      }

      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          action: 'Bulk Assignment Complete',
          user: 'Marcus Vance',
          details: `Completed bulk updates for ${dto.userIds.length} users.`,
        },
      });

      return { success: true };
    });
  }

  // List pending invitations
  async getInvitations(orgId: string) {
    const invites = await this.prisma.organizationInvitation.findMany({
      where: { organizationId: orgId },
      include: { role: true, roles: true },
      orderBy: { createdAt: 'desc' },
    });

    return invites.map((inv) => {
      const allRoles = [inv.role, ...(inv.roles || [])];
      const uniqueRolesMap = new Map();
      allRoles.forEach(r => uniqueRolesMap.set(r.id, r));
      const uniqueRoles = Array.from(uniqueRolesMap.values());

      return {
        id: inv.id,
        phoneNumber: inv.phoneNumber,
        email: inv.email,
        fullName: inv.fullName,
        role: {
          id: inv.role.id,
          name: inv.role.name,
        },
        roles: uniqueRoles.map(r => ({
          id: r.id,
          name: r.name,
        })),
        gymIds: inv.gymIds === 'all' ? 'all' : inv.gymIds.split(','),
        invitedBy: inv.invitedBy,
        sentDate: inv.createdAt.toISOString().split('T')[0],
        expiryDate: inv.expiresAt.toISOString().split('T')[0],
        status: inv.status,
        viewedAt: inv.viewedAt ? inv.viewedAt.toISOString().split('T')[0] : null,
        acceptedAt: inv.acceptedAt ? inv.acceptedAt.toISOString().split('T')[0] : null,
        declinedAt: inv.rejectedAt ? inv.rejectedAt.toISOString().split('T')[0] : null,
        cancelledAt: inv.cancelledAt ? inv.cancelledAt.toISOString().split('T')[0] : null,
      };
    });
  }

  // Invite user
  async createInvitation(orgId: string, dto: InviteUserDto, callerPhoneNumber?: string) {
    const roleIdsToAssign = dto.roleIds && dto.roleIds.length > 0
      ? dto.roleIds
      : dto.roleId
      ? [dto.roleId]
      : [];

    if (roleIdsToAssign.length === 0) {
      throw new BadRequestException('At least one role must be specified for the invitation');
    }

    const validRoles = await this.prisma.role.findMany({
      where: {
        id: { in: roleIdsToAssign },
        OR: [{ organizationId: orgId }, { organizationId: null }],
      },
    });

    if (validRoles.length !== roleIdsToAssign.length) {
      throw new NotFoundException('One or more roles not found');
    }

    const primaryRoleId = roleIdsToAssign[0];
    const role = validRoles.find(r => r.id === primaryRoleId);

    if (callerPhoneNumber) {
      const normCaller = callerPhoneNumber.replace(/\D/g, '');
      const normTarget = dto.phoneNumber.replace(/\D/g, '');
      if (normCaller === normTarget && normCaller.length > 0) {
        throw new BadRequestException('You cannot invite yourself to this organization.');
      }
    }

    // Check for existing pending invitation for the same phone number in this organization
    const existingInvite = await this.prisma.organizationInvitation.findFirst({
      where: {
        organizationId: orgId,
        phoneNumber: dto.phoneNumber,
        status: 'Pending',
      },
    });

    if (existingInvite) {
      throw new BadRequestException(
        'An active pending invitation already exists for this phone number.',
      );
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const gymIdsStr = dto.gymIds && dto.gymIds.length > 0 ? dto.gymIds.join(',') : 'all';

    return this.prisma.$transaction(async (tx) => {
      const invite = await tx.organizationInvitation.create({
        data: {
          organizationId: orgId,
          phoneNumber: dto.phoneNumber,
          email: dto.email || null,
          fullName: dto.fullName || null,
          roleId: primaryRoleId,
          gymIds: gymIdsStr,
          status: 'Pending',
          expiresAt,
          invitedBy: 'Marcus Vance',
          roles: {
            connect: roleIdsToAssign.map(id => ({ id })),
          },
        },
      });

      const roleNames = validRoles.map(r => r.name).join(', ');
      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          action: 'User Invited',
          user: 'Marcus Vance',
          details: `Invited user '${dto.fullName || dto.phoneNumber}' with roles '${roleNames}'.`,
          eventType: 'INVITATION_SENT',
          eventCategory: 'Security',
          entityType: 'Invitation',
          entityId: invite.id,
          metadata: { roleNames, phoneNumber: dto.phoneNumber },
        },
      });

      return invite;
    });
  }

  // Resend invitation
  async resendInvitation(orgId: string, id: string) {
    const invite = await this.prisma.organizationInvitation.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!invite) {
      throw new NotFoundException('Invitation not found');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    return this.prisma.organizationInvitation.update({
      where: { id },
      data: {
        expiresAt,
        status: 'Pending',
        createdAt: new Date(), // Reset sent date to now
      },
    });
  }

  // Cancel/Delete invitation
  async deleteInvitation(orgId: string, id: string) {
    const invite = await this.prisma.organizationInvitation.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!invite) {
      throw new NotFoundException('Invitation not found');
    }

    await this.prisma.organizationInvitation.delete({
      where: { id },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        action: 'Invitation Deleted',
        user: 'Marcus Vance',
        details: `Permanently deleted invitation for phone number '${invite.phoneNumber}'.`,
        eventType: 'INVITATION_CANCELLED',
        eventCategory: 'Security',
        entityType: 'Invitation',
        entityId: id,
      },
    });

    return { success: true };
  }

  // Fetch invitation details (unauthenticated / public)
  async getInvitationDetails(id: string) {
    const invite = await this.prisma.organizationInvitation.findUnique({
      where: { id },
      include: {
        organization: true,
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        roles: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!invite) {
      throw new NotFoundException('Invitation not found');
    }

    // Track viewed timestamp
    if (invite.status === 'Pending' && !invite.viewedAt) {
      await this.prisma.organizationInvitation.update({
        where: { id },
        data: { viewedAt: new Date() },
      });
      invite.viewedAt = new Date();
    }

    const allRoles = [invite.role, ...(invite.roles || [])];
    const uniqueRolesMap = new Map();
    allRoles.forEach(r => uniqueRolesMap.set(r.id, r));
    const uniqueRoles = Array.from(uniqueRolesMap.values());

    const permissionSet = new Set<string>();
    uniqueRoles.forEach(r => {
      r.rolePermissions.forEach((rp: any) => {
        permissionSet.add(`${rp.permission.resource}.${rp.permission.action}`);
      });
    });
    const permissions = Array.from(permissionSet);

    return {
      id: invite.id,
      phoneNumber: invite.phoneNumber,
      email: invite.email,
      fullName: invite.fullName,
      status: invite.status,
      expiresAt: invite.expiresAt,
      invitedBy: invite.invitedBy,
      sentDate: invite.createdAt.toISOString().split('T')[0],
      gymIds: invite.gymIds === 'all' ? 'all' : invite.gymIds.split(','),
      organization: {
        id: invite.organization.id,
        name: invite.organization.name,
        logoUrl: invite.organization.logoUrl,
      },
      role: {
        id: invite.role.id,
        name: invite.role.name,
        description: invite.role.description || '',
        permissions,
      },
      roles: uniqueRoles.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description || '',
      })),
      viewedAt: invite.viewedAt,
      acceptedAt: invite.acceptedAt,
      declinedAt: invite.rejectedAt,
      cancelledAt: invite.cancelledAt,
    };
  }

  // Decline/Reject invitation (public)
  async declineInvitation(id: string) {
    const invite = await this.prisma.organizationInvitation.findUnique({
      where: { id },
    });

    if (!invite) {
      throw new NotFoundException('Invitation not found');
    }

    if (invite.status !== 'Pending') {
      throw new BadRequestException(`Invitation is already ${invite.status}`);
    }

    const updated = await this.prisma.organizationInvitation.update({
      where: { id },
      data: {
        status: 'Rejected',
        rejectedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: invite.organizationId,
        action: 'Invitation Declined',
        user: invite.fullName || invite.phoneNumber,
        details: `Declined invitation to join organization.`,
        eventType: 'INVITATION_REJECTED',
        eventCategory: 'Security',
        entityType: 'Invitation',
        entityId: id,
      },
    });

    return updated;
  }

  // Accept invitation (requires authenticated user)
  async acceptInvitation(id: string, userId: string, phoneNumber: string) {
    const invite = await this.prisma.organizationInvitation.findUnique({
      where: { id },
      include: { roles: true },
    });

    if (!invite) {
      throw new NotFoundException('Invitation not found');
    }

    if (invite.status !== 'Pending') {
      throw new BadRequestException(`Invitation is already ${invite.status}`);
    }

    const normInvitePhone = invite.phoneNumber.replace(/\D/g, '');
    const normUserPhone = phoneNumber.replace(/\D/g, '');
    if (normInvitePhone !== normUserPhone && !normInvitePhone.endsWith(normUserPhone) && !normUserPhone.endsWith(normInvitePhone)) {
      throw new BadRequestException('Phone number mismatch with invitation');
    }

    if (new Date() > invite.expiresAt) {
      await this.prisma.organizationInvitation.update({
        where: { id },
        data: { status: 'Expired' },
      });
      throw new BadRequestException('Invitation has expired');
    }

    return this.prisma.$transaction(async (tx) => {
      // Create organization user if they don't already exist
      const existingUser = await tx.organizationUser.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId: invite.organizationId,
          },
        },
      });

      if (!existingUser) {
        await tx.organizationUser.create({
          data: {
            userId,
            organizationId: invite.organizationId,
            roleId: invite.roleId,
            roles: {
              connect: invite.roles.map(r => ({ id: r.id })),
            },
            isActive: true,
          },
        });
      }

      // If specific gym branches are defined, set up Employee Gym Assignments
      if (invite.gymIds !== 'all') {
        let employee = await tx.employee.findFirst({
          where: { userId, organizationId: invite.organizationId },
        });

        if (!employee) {
          employee = await tx.employee.create({
            data: {
              organizationId: invite.organizationId,
              userId,
            },
          });
        }

        const gymIds = invite.gymIds.split(',');
        await tx.employeeGymAssignment.deleteMany({
          where: { employeeId: employee.id },
        });

        for (const gymId of gymIds) {
          await tx.employeeGymAssignment.create({
            data: {
              employeeId: employee.id,
              gymId,
            },
          });
        }
      }

      // Mark invitation as Accepted
      const acceptedInvite = await tx.organizationInvitation.update({
        where: { id },
        data: {
          status: 'Accepted',
          acceptedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: invite.organizationId,
          action: 'Invitation Accepted',
          user: invite.fullName || phoneNumber,
          details: `Accepted invitation and joined the organization.`,
          eventType: 'INVITATION_ACCEPTED',
          eventCategory: 'Security',
          entityType: 'Invitation',
          entityId: id,
        },
      });

      return { success: true, organizationId: invite.organizationId };
    });
  }

  // Private helper: Verify that at least one other active owner exists
  private async verifyActiveOwnerExists(orgId: string, userId: string) {
    const activeOwnersCount = await this.prisma.organizationUser.count({
      where: {
        organizationId: orgId,
        role: { name: 'Organization Owner' },
        isActive: true,
        userId: { not: userId },
      },
    });

    if (activeOwnersCount === 0) {
      throw new BadRequestException(
        'Action blocked. An organization must have at least one active Organization Owner.',
      );
    }
  }
}
