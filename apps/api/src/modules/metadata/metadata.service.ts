import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { CreateMetadataDto, UpdateMetadataDto, MergeMetadataDto, BulkImportDto } from './dto/metadata.dto';

@Injectable()
export class MetadataService {
  constructor(private prisma: DatabaseService) {}

  // Helper to calculate string similarity (for duplicate warning suggestions)
  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1.0;
    
    // Check word subsets
    const words1 = new Set(s1.split(/\s+/));
    const words2 = new Set(s2.split(/\s+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    
    if (intersection.size > 0) {
      const unionSize = new Set([...words1, ...words2]).size;
      return intersection.size / unionSize;
    }
    
    return 0.0;
  }

  async checkDuplicate(organizationId: string, type: string, name: string) {
    const cleanName = name.trim();
    
    // Find all active metadata items of the same type (system + custom)
    const existing = await this.prisma.metadataItem.findMany({
      where: {
        type,
        status: 'Active',
        OR: [
          { organizationId: null },
          { organizationId }
        ]
      }
    });

    const suggestions: string[] = [];
    let exactMatchExists = false;

    for (const item of existing) {
      if (item.name.toLowerCase() === cleanName.toLowerCase()) {
        exactMatchExists = true;
      }
      
      const similarity = this.calculateSimilarity(item.name, cleanName);
      // Warning threshold is similarity > 40% (e.g. "Chest Muscles" vs "Chest" is 50%)
      if (similarity > 0.35 && suggestions.length < 5) {
        suggestions.push(item.name);
      }
    }

    return {
      isDuplicate: exactMatchExists,
      suggestions,
      warning: suggestions.length > 0 ? `Similar items already exist: ${suggestions.join(', ')}` : null
    };
  }

  async listMetadata(
    organizationId: string,
    filters: {
      type?: string;
      search?: string;
      status?: string;
      source?: string; // system, custom, all
      page?: number;
      limit?: number;
    }
  ) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 50;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
      OR: [
        { organizationId: null },
        { organizationId }
      ]
    };

    if (filters.type && filters.type !== 'all') {
      where.type = filters.type;
    }

    if (filters.status && filters.status !== 'all') {
      where.status = filters.status;
    }

    if (filters.source && filters.source !== 'all') {
      if (filters.source === 'system') {
        where.isSystem = true;
      } else if (filters.source === 'custom') {
        where.isSystem = false;
        where.organizationId = organizationId;
      }
    }

    if (filters.search) {
      const q = filters.search.trim();
      where.AND = [
        {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } }
          ]
        }
      ];
    }

    const [total, records] = await Promise.all([
      this.prisma.metadataItem.count({ where }),
      this.prisma.metadataItem.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      })
    ]);

    return {
      items: records,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getMetadataItem(id: string, organizationId: string) {
    const item = await this.prisma.metadataItem.findUnique({
      where: { id }
    });

    if (!item || item.deletedAt) {
      throw new NotFoundException('Metadata item not found');
    }

    if (item.organizationId && item.organizationId !== organizationId) {
      throw new ForbiddenException('No permission to access this item');
    }

    return item;
  }

  async createMetadata(organizationId: string, userId: string, userName: string, dto: CreateMetadataDto) {
    // 1. Perform duplicate check
    const check = await this.checkDuplicate(organizationId, dto.type, dto.name);
    if (check.isDuplicate) {
      throw new BadRequestException(`Category or Metadata "${dto.name}" already exists.`);
    }

    const item = await this.prisma.metadataItem.create({
      data: {
        ...dto,
        isSystem: false,
        organizationId,
        status: dto.status || 'Active',
      }
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        user: userName,
        action: 'Category Created',
        details: `Created custom exercise metadata item: [${dto.type}] "${dto.name}"`
      }
    });

    return {
      item,
      suggestions: check.suggestions,
      warning: check.warning
    };
  }

  async updateMetadata(id: string, organizationId: string, userId: string, userName: string, dto: UpdateMetadataDto) {
    const item = await this.prisma.metadataItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('Metadata item not found');
    }

    if (item.isSystem || item.organizationId !== organizationId) {
      throw new ForbiddenException('Only custom organization metadata items can be updated');
    }

    const updated = await this.prisma.metadataItem.update({
      where: { id },
      data: dto,
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        user: userName,
        action: 'Category Updated',
        details: `Updated custom metadata item "${item.name}". Changed attributes: ${Object.keys(dto).join(', ')}`
      }
    });

    return updated;
  }

  async softDeleteMetadata(id: string, organizationId: string, userId: string, userName: string) {
    const item = await this.prisma.metadataItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('Metadata item not found');
    }

    if (item.isSystem || item.organizationId !== organizationId) {
      throw new ForbiddenException('Only custom organization metadata items can be deleted');
    }

    await this.prisma.metadataItem.update({
      where: { id },
      data: {
        status: 'Archived',
        deletedAt: new Date()
      }
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        user: userName,
        action: 'Category Deleted',
        details: `Soft-deleted (archived) custom metadata item: [${item.type}] "${item.name}"`
      }
    });

    return { success: true };
  }

  async mergeMetadata(organizationId: string, userId: string, userName: string, dto: MergeMetadataDto) {
    const { sourceId, targetId } = dto;

    const [sourceItem, targetItem] = await Promise.all([
      this.prisma.metadataItem.findUnique({ where: { id: sourceId } }),
      this.prisma.metadataItem.findUnique({ where: { id: targetId } })
    ]);

    if (!sourceItem || !targetItem) {
      throw new NotFoundException('Source or target metadata item not found');
    }

    if (sourceItem.type !== targetItem.type) {
      throw new BadRequestException('Cannot merge metadata items of different classification types');
    }

    // Scoping validation
    if (sourceItem.organizationId && sourceItem.organizationId !== organizationId) {
      throw new ForbiddenException('Insufficient permissions for the source metadata');
    }

    // Process linked exercises to swap source name to target name
    const exercises = await this.prisma.exercise.findMany({
      where: {
        OR: [
          { organizationId: null },
          { organizationId }
        ]
      }
    });

    let updatedCount = 0;

    for (const ex of exercises) {
      let isUpdated = false;
      const dataUpdate: any = {};

      if (sourceItem.type === 'Category' && ex.category === sourceItem.name) {
        dataUpdate.category = targetItem.name;
        isUpdated = true;
      }

      if (sourceItem.type === 'Muscle') {
        if (ex.primaryMuscle === sourceItem.name) {
          dataUpdate.primaryMuscle = targetItem.name;
          isUpdated = true;
        }
        if (ex.secondaryMuscles.includes(sourceItem.name)) {
          dataUpdate.secondaryMuscles = ex.secondaryMuscles.map(m => m === sourceItem.name ? targetItem.name : m);
          isUpdated = true;
        }
      }

      if (sourceItem.type === 'Equipment' && ex.equipment === sourceItem.name) {
        dataUpdate.equipment = targetItem.name;
        isUpdated = true;
      }

      if (sourceItem.type === 'Difficulty' && ex.difficulty === sourceItem.name) {
        dataUpdate.difficulty = targetItem.name;
        isUpdated = true;
      }

      if (sourceItem.type === 'MovementPattern' && ex.movementPattern === sourceItem.name) {
        dataUpdate.movementPattern = targetItem.name;
        isUpdated = true;
      }

      if (isUpdated) {
        await this.prisma.exercise.update({
          where: { id: ex.id },
          data: dataUpdate
        });
        updatedCount++;
      }
    }

    // Update target item count and delete/archive source item
    await this.prisma.metadataItem.update({
      where: { id: targetId },
      data: {
        usageCount: targetItem.usageCount + sourceItem.usageCount
      }
    });

    await this.prisma.metadataItem.update({
      where: { id: sourceId },
      data: {
        status: 'Archived',
        deletedAt: new Date()
      }
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        user: userName,
        action: 'Category Merged',
        details: `Merged duplicate category [${sourceItem.type}] "${sourceItem.name}" into "${targetItem.name}". Updated ${updatedCount} exercises.`
      }
    });

    return {
      success: true,
      updatedExercisesCount: updatedCount,
      targetName: targetItem.name
    };
  }

  async bulkImport(organizationId: string, userId: string, userName: string, dto: BulkImportDto) {
    let imported = 0;
    
    for (const item of dto.items) {
      const check = await this.checkDuplicate(organizationId, item.type, item.name);
      if (!check.isDuplicate) {
        await this.prisma.metadataItem.create({
          data: {
            ...item,
            isSystem: false,
            organizationId,
            status: item.status || 'Active'
          }
        });
        imported++;
      }
    }

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        user: userName,
        action: 'Metadata Imported',
        details: `Bulk imported ${imported} custom metadata taxonomy records via JSON upload.`
      }
    });

    return { success: true, count: imported };
  }

  async getAnalytics(organizationId: string) {
    const totalCount = await this.prisma.metadataItem.count({
      where: {
        deletedAt: null,
        OR: [{ organizationId: null }, { organizationId }]
      }
    });

    // Exercise count grouped by Muscle
    const muscles = await this.prisma.metadataItem.findMany({
      where: { type: 'Muscle', deletedAt: null },
      select: { name: true, usageCount: true },
      orderBy: { usageCount: 'desc' },
      take: 6
    });

    // Exercise count grouped by Equipment
    const equipment = await this.prisma.metadataItem.findMany({
      where: { type: 'Equipment', deletedAt: null },
      select: { name: true, usageCount: true },
      orderBy: { usageCount: 'desc' },
      take: 6
    });

    // Exercise count grouped by Difficulty
    const difficulty = await this.prisma.metadataItem.findMany({
      where: { type: 'Difficulty', deletedAt: null },
      select: { name: true, usageCount: true },
      orderBy: { usageCount: 'desc' }
    });

    const categoryDistribution = await this.prisma.metadataItem.findMany({
      where: { type: 'Category', deletedAt: null },
      select: { name: true, usageCount: true },
      orderBy: { usageCount: 'desc' },
      take: 6
    });

    // Audit Log history
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        organizationId,
        action: { in: ['Category Created', 'Category Updated', 'Category Deleted', 'Category Merged', 'Metadata Imported'] }
      },
      orderBy: { createdAt: 'desc' },
      take: 15
    });

    return {
      totalTaxonomyItems: totalCount,
      exercisesByMuscle: muscles,
      exercisesByEquipment: equipment,
      exercisesByDifficulty: difficulty,
      exercisesByCategory: categoryDistribution,
      auditHistory: auditLogs.map(l => ({
        id: l.id,
        action: l.action,
        user: l.user,
        details: l.details,
        timestamp: l.createdAt
      }))
    };
  }
}
