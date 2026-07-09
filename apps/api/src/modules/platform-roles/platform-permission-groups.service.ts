import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreatePermissionGroupDto, UpdatePermissionGroupDto } from './dto/permission-group.dto';

@Injectable()
export class PlatformPermissionGroupsService {
  constructor(
    private prisma: DatabaseService,
    private auditLogsService: AuditLogsService,
  ) {}

  async list() {
    const groups = await this.prisma.platformPermissionGroup.findMany({
      include: { items: { include: { permission: true } }, _count: { select: { roleAssignments: true } } },
      orderBy: { name: 'asc' },
    });
    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      category: g.category,
      isSystem: g.isSystem,
      permissionCount: g.items.length,
      rolesUsingGroup: g._count.roleAssignments,
      permissions: g.items.map((i) => ({ key: i.permission.key, label: i.permission.label })),
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    }));
  }

  async create(dto: CreatePermissionGroupDto, actorUserId: string) {
    const existing = await this.prisma.platformPermissionGroup.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException(`A permission group named "${dto.name}" already exists.`);

    const group = await this.prisma.platformPermissionGroup.create({
      data: { name: dto.name, description: dto.description, category: dto.category },
    });
    if (dto.permissionKeys?.length) await this.setItems(group.id, dto.permissionKeys);

    await this.logEvent(actorUserId, 'Permission Group Created', `Created permission group "${dto.name}".`, group.id);
    return group;
  }

  async update(id: string, dto: UpdatePermissionGroupDto, actorUserId: string) {
    const group = await this.assertExists(id);
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.category !== undefined) data.category = dto.category;
    if (Object.keys(data).length) await this.prisma.platformPermissionGroup.update({ where: { id }, data });
    if (dto.permissionKeys) await this.setItems(id, dto.permissionKeys);

    await this.logEvent(actorUserId, 'Permission Group Updated', `Updated permission group "${group.name}".`, id);
    return this.prisma.platformPermissionGroup.findUnique({ where: { id } });
  }

  async remove(id: string, actorUserId: string) {
    const group = await this.assertExists(id);
    if (group.isSystem) throw new BadRequestException('System permission groups cannot be deleted.');
    await this.prisma.platformPermissionGroup.delete({ where: { id } });
    await this.logEvent(actorUserId, 'Permission Group Deleted', `Deleted permission group "${group.name}".`, id);
    return { ok: true };
  }

  private async setItems(groupId: string, permissionKeys: string[]) {
    const permissions = await this.prisma.platformPermission.findMany({ where: { key: { in: permissionKeys } } });
    await this.prisma.platformPermissionGroupItem.deleteMany({ where: { groupId } });
    for (const p of permissions) {
      await this.prisma.platformPermissionGroupItem.create({ data: { groupId, permissionId: p.id } });
    }
  }

  private async assertExists(id: string) {
    const group = await this.prisma.platformPermissionGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundException('Permission group not found');
    return group;
  }

  private async logEvent(actorUserId: string, action: string, details: string, entityId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: actorUserId } });
    await this.auditLogsService.logEvent({
      userId: actorUserId,
      action,
      user: user?.fullName || 'Platform Admin',
      details,
      eventCategory: 'Roles & Permissions',
      entityType: 'PlatformPermissionGroup',
      entityId,
    });
  }
}
