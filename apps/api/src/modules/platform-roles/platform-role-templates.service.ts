import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateRoleTemplateDto, UpdateRoleTemplateDto } from './dto/role-template.dto';

@Injectable()
export class PlatformRoleTemplatesService {
  constructor(
    private prisma: DatabaseService,
    private auditLogsService: AuditLogsService,
  ) {}

  list() {
    return this.prisma.platformRoleTemplate.findMany({ orderBy: { name: 'asc' } });
  }

  async create(dto: CreateRoleTemplateDto, actorUserId: string) {
    const existing = await this.prisma.platformRoleTemplate.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException(`A role template named "${dto.name}" already exists.`);
    const template = await this.prisma.platformRoleTemplate.create({
      data: { name: dto.name, description: dto.description, category: dto.category, permissionKeys: dto.permissionKeys || [], groupIds: dto.groupIds || [] },
    });
    await this.logEvent(actorUserId, 'Role Template Created', `Created role template "${dto.name}".`, template.id);
    return template;
  }

  async update(id: string, dto: UpdateRoleTemplateDto, actorUserId: string) {
    const template = await this.assertExists(id);
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.permissionKeys !== undefined) data.permissionKeys = dto.permissionKeys;
    if (dto.groupIds !== undefined) data.groupIds = dto.groupIds;
    const updated = await this.prisma.platformRoleTemplate.update({ where: { id }, data });
    await this.logEvent(actorUserId, 'Role Template Updated', `Updated role template "${template.name}".`, id);
    return updated;
  }

  async remove(id: string, actorUserId: string) {
    const template = await this.assertExists(id);
    if (template.isSystem) throw new BadRequestException('System role templates cannot be deleted.');
    await this.prisma.platformRoleTemplate.delete({ where: { id } });
    await this.logEvent(actorUserId, 'Role Template Deleted', `Deleted role template "${template.name}".`, id);
    return { ok: true };
  }

  private async assertExists(id: string) {
    const template = await this.prisma.platformRoleTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Role template not found');
    return template;
  }

  private async logEvent(actorUserId: string, action: string, details: string, entityId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: actorUserId } });
    await this.auditLogsService.logEvent({
      userId: actorUserId,
      action,
      user: user?.fullName || 'Platform Admin',
      details,
      eventCategory: 'Roles & Permissions',
      entityType: 'PlatformRoleTemplate',
      entityId,
    });
  }
}
