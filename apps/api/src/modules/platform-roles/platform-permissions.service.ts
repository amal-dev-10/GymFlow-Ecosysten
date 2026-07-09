import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';

@Injectable()
export class PlatformPermissionsService {
  constructor(private prisma: DatabaseService) {}

  listCategories() {
    return this.prisma.platformPermissionCategory.findMany({ orderBy: { order: 'asc' } });
  }

  listActions() {
    return this.prisma.platformPermissionAction.findMany({ orderBy: { label: 'asc' } });
  }

  async search(query: { search?: string; categoryKey?: string; actionKey?: string; roleId?: string }) {
    const where: any = {};
    if (query.categoryKey) where.categoryKey = query.categoryKey;
    if (query.actionKey) where.actionKey = query.actionKey;
    if (query.search) {
      where.OR = [
        { key: { contains: query.search, mode: 'insensitive' } },
        { label: { contains: query.search, mode: 'insensitive' } },
        { resourceLabel: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.roleId) {
      where.rolePermissions = { some: { roleId: query.roleId } };
    }

    const permissions = await this.prisma.platformPermission.findMany({
      where,
      include: { category: true, action: true },
      orderBy: [{ categoryKey: 'asc' }, { label: 'asc' }],
    });

    return permissions.map((p) => ({
      id: p.id,
      key: p.key,
      label: p.label,
      description: p.description,
      resourceLabel: p.resourceLabel,
      isSensitive: p.isSensitive,
      category: p.category.label,
      categoryKey: p.categoryKey,
      action: p.action.label,
      actionKey: p.actionKey,
    }));
  }

  /** Grouped by category, for the Permission Tree / Role Creation Wizard step 2. */
  async tree() {
    const [categories, permissions] = await Promise.all([
      this.prisma.platformPermissionCategory.findMany({ orderBy: { order: 'asc' } }),
      this.prisma.platformPermission.findMany({ include: { action: true }, orderBy: { label: 'asc' } }),
    ]);
    return categories.map((c) => ({
      key: c.key,
      label: c.label,
      icon: c.icon,
      permissions: permissions
        .filter((p) => p.categoryKey === c.key)
        .map((p) => ({ key: p.key, label: p.label, action: p.action.label, isSensitive: p.isSensitive })),
    }));
  }
}
