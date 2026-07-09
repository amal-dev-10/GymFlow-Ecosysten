import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { CreateWorkoutDto, UpdateWorkoutDto, BulkWorkoutActionDto } from './dto/workouts.dto';

@Injectable()
export class WorkoutsService {
  constructor(private prisma: DatabaseService) {}

  async listWorkouts(
    organizationId: string,
    filters: {
      search?: string;
      type?: string;
      difficulty?: string;
      status?: string;
      isTemplate?: boolean;
      isFavorite?: boolean;
      page?: number;
      limit?: number;
    }
  ) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 15;
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
      deletedAt: null,
    };

    if (filters.type && filters.type !== 'all') {
      where.type = filters.type;
    }

    if (filters.difficulty && filters.difficulty !== 'all') {
      where.difficulty = filters.difficulty;
    }

    if (filters.status && filters.status !== 'all') {
      where.status = filters.status;
    }

    if (filters.isTemplate !== undefined) {
      where.isTemplate = filters.isTemplate;
    }

    if (filters.isFavorite !== undefined) {
      where.isFavorite = filters.isFavorite;
    }

    if (filters.search) {
      const q = filters.search.trim();
      where.AND = [
        {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { type: { contains: q, mode: 'insensitive' } },
            { notes: { contains: q, mode: 'insensitive' } }
          ]
        }
      ];
    }

    const [total, records] = await Promise.all([
      this.prisma.workout.count({ where }),
      this.prisma.workout.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      })
    ]);

    return {
      workouts: records,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getWorkout(id: string, organizationId: string) {
    const workout = await this.prisma.workout.findUnique({
      where: { id }
    });

    if (!workout || workout.deletedAt) {
      throw new NotFoundException('Workout template not found');
    }

    if (workout.organizationId !== organizationId) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return workout;
  }

  async createWorkout(organizationId: string, creatorId: string, dto: CreateWorkoutDto) {
    const workout = await this.prisma.workout.create({
      data: {
        organizationId,
        creatorId,
        name: dto.name,
        type: dto.type || 'Strength',
        difficulty: dto.difficulty || 'Intermediate',
        duration: dto.duration || 45,
        calories: dto.calories || 300,
        visibility: dto.visibility || 'Organization',
        status: dto.status || 'Draft',
        isTemplate: dto.isTemplate !== undefined ? dto.isTemplate : true,
        isFavorite: dto.isFavorite || false,
        notes: dto.notes,
        memberNotes: dto.memberNotes,
        prepNotes: dto.prepNotes,
        equipmentNotes: dto.equipmentNotes,
        structure: dto.structure || [],
      }
    });

    // Create first history revision
    await this.prisma.workoutVersion.create({
      data: {
        workoutId: workout.id,
        versionNumber: 1,
        name: `Initial Revision`,
        notes: `Created template draft`,
        structure: workout.structure || [],
      }
    });

    return workout;
  }

  async updateWorkout(id: string, organizationId: string, dto: UpdateWorkoutDto) {
    const workout = await this.prisma.workout.findUnique({ where: { id } });
    if (!workout || workout.deletedAt) {
      throw new NotFoundException('Workout not found');
    }

    if (workout.organizationId !== organizationId) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const nextVersion = workout.version + 1;
    const structureChanged = dto.structure && JSON.stringify(dto.structure) !== JSON.stringify(workout.structure);

    const updated = await this.prisma.workout.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        difficulty: dto.difficulty,
        duration: dto.duration,
        calories: dto.calories,
        visibility: dto.visibility,
        status: dto.status,
        isTemplate: dto.isTemplate,
        isFavorite: dto.isFavorite,
        notes: dto.notes,
        memberNotes: dto.memberNotes,
        prepNotes: dto.prepNotes,
        equipmentNotes: dto.equipmentNotes,
        structure: dto.structure,
        version: structureChanged ? nextVersion : workout.version,
      }
    });

    // If structure was modified, auto-save version trace
    if (structureChanged) {
      await this.prisma.workoutVersion.create({
        data: {
          workoutId: workout.id,
          versionNumber: nextVersion,
          name: dto.name || workout.name,
          notes: dto.versionNotes || `Updated exercises layout & values`,
          structure: dto.structure,
        }
      });
    }

    return updated;
  }

  async softDeleteWorkout(id: string, organizationId: string) {
    const workout = await this.prisma.workout.findUnique({ where: { id } });
    if (!workout || workout.deletedAt) {
      throw new NotFoundException('Workout not found');
    }

    if (workout.organizationId !== organizationId) {
      throw new ForbiddenException('Insufficient permissions');
    }

    await this.prisma.workout.update({
      where: { id },
      data: {
        status: 'Archived',
        deletedAt: new Date()
      }
    });

    return { success: true };
  }

  async duplicateWorkout(id: string, organizationId: string, creatorId: string) {
    const original = await this.getWorkout(id, organizationId);

    const copy = await this.prisma.workout.create({
      data: {
        organizationId,
        creatorId,
        name: `Copy of ${original.name}`,
        type: original.type,
        difficulty: original.difficulty,
        duration: original.duration,
        calories: original.calories,
        visibility: original.visibility,
        status: 'Draft',
        isTemplate: original.isTemplate,
        isFavorite: false,
        notes: original.notes,
        memberNotes: original.memberNotes,
        prepNotes: original.prepNotes,
        equipmentNotes: original.equipmentNotes,
        structure: original.structure || [],
      }
    });

    await this.prisma.workoutVersion.create({
      data: {
        workoutId: copy.id,
        versionNumber: 1,
        name: `Initial Seed (Cloned)`,
        notes: `Duplicated from "${original.name}"`,
        structure: copy.structure || [],
      }
    });

    return copy;
  }

  async getVersions(workoutId: string, organizationId: string) {
    await this.getWorkout(workoutId, organizationId); // Perm check

    return this.prisma.workoutVersion.findMany({
      where: { workoutId },
      orderBy: { versionNumber: 'desc' }
    });
  }

  async restoreVersion(workoutId: string, versionId: string, organizationId: string) {
    const workout = await this.getWorkout(workoutId, organizationId);
    
    const target = await this.prisma.workoutVersion.findUnique({
      where: { id: versionId }
    });

    if (!target || target.workoutId !== workoutId) {
      throw new NotFoundException('Version history entry not found');
    }

    const nextVersion = workout.version + 1;

    const restored = await this.prisma.workout.update({
      where: { id: workoutId },
      data: {
        structure: target.structure || [],
        version: nextVersion
      }
    });

    // Create a new version log indicating the restore action
    await this.prisma.workoutVersion.create({
      data: {
        workoutId,
        versionNumber: nextVersion,
        name: workout.name,
        notes: `Restored to Revision #${target.versionNumber} ("${target.name}")`,
        structure: target.structure || [],
      }
    });

    return restored;
  }

  async bulkAction(organizationId: string, dto: BulkWorkoutActionDto) {
    const { ids, action } = dto;

    if (action === 'delete') {
      await this.prisma.workout.updateMany({
        where: { id: { in: ids }, organizationId },
        data: {
          status: 'Archived',
          deletedAt: new Date()
        }
      });
    } else if (action === 'archive') {
      await this.prisma.workout.updateMany({
        where: { id: { in: ids }, organizationId },
        data: { status: 'Archived' }
      });
    } else if (action === 'publish') {
      await this.prisma.workout.updateMany({
        where: { id: { in: ids }, organizationId },
        data: { status: 'Published' }
      });
    }

    return { success: true, affected: ids.length };
  }

  async getAnalytics(organizationId: string) {
    const totalTemplates = await this.prisma.workout.count({
      where: { organizationId, isTemplate: true, deletedAt: null }
    });

    const publishedTemplates = await this.prisma.workout.count({
      where: { organizationId, isTemplate: true, status: 'Published', deletedAt: null }
    });

    const draftTemplates = await this.prisma.workout.count({
      where: { organizationId, isTemplate: true, status: 'Draft', deletedAt: null }
    });

    const averageDuration = await this.prisma.workout.aggregate({
      where: { organizationId, deletedAt: null },
      _avg: { duration: true }
    });

    // Simple distribution of workout types
    const workouts = await this.prisma.workout.findMany({
      where: { organizationId, deletedAt: null },
      select: { type: true, structure: true }
    });

    const typeDistribution: Record<string, number> = {};
    const muscleDistribution: Record<string, number> = {};
    const exerciseUsage: Record<string, number> = {};

    workouts.forEach(w => {
      typeDistribution[w.type] = (typeDistribution[w.type] || 0) + 1;
      
      const structure = w.structure as any[];
      if (Array.isArray(structure)) {
        structure.forEach(section => {
          if (Array.isArray(section.blocks)) {
            section.blocks.forEach((block: any) => {
              if (block.name) {
                exerciseUsage[block.name] = (exerciseUsage[block.name] || 0) + 1;
              }
              if (block.primaryMuscle) {
                muscleDistribution[block.primaryMuscle] = (muscleDistribution[block.primaryMuscle] || 0) + 1;
              }
            });
          }
        });
      }
    });

    const formatMetrics = (record: Record<string, number>, limit = 5) => {
      return Object.entries(record)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    };

    return {
      totalTemplates,
      publishedTemplates,
      draftTemplates,
      averageDurationMinutes: Math.round(averageDuration._avg.duration || 45),
      types: formatMetrics(typeDistribution),
      muscleGroupDistribution: formatMetrics(muscleDistribution, 6),
      frequentExercises: formatMetrics(exerciseUsage, 6)
    };
  }
}
