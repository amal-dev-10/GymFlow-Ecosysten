import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { CreateExerciseDto, UpdateExerciseDto, BulkActionDto } from './dto/exercises.dto';

@Injectable()
export class ExercisesService {
  constructor(private prisma: DatabaseService) {}

  async listExercises(
    organizationId: string,
    userId: string,
    filters: {
      search?: string;
      source?: string;
      muscleGroup?: string;
      equipment?: string;
      difficulty?: string;
      category?: string;
      visibility?: string;
      favoritesOnly?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    // Build Prisma query condition
    const where: any = {
      OR: [
        // Global exercises
        { organizationId: null },
        // Custom to this organization
        { organizationId },
      ]
    };

    // Filter by search query
    if (filters.search) {
      const s = filters.search.trim();
      where.AND = [
        {
          OR: [
            { name: { contains: s, mode: 'insensitive' } },
            { description: { contains: s, mode: 'insensitive' } },
            { primaryMuscle: { contains: s, mode: 'insensitive' } },
            { equipment: { contains: s, mode: 'insensitive' } },
            { category: { contains: s, mode: 'insensitive' } },
          ]
        }
      ];
    }

    // Filter by source
    if (filters.source && filters.source !== 'all') {
      // If filtering custom, only return custom for this organization
      if (filters.source === 'Custom') {
        where.source = 'Custom';
        where.organizationId = organizationId;
      } else {
        where.source = filters.source;
      }
    }

    // Filter by muscle group
    if (filters.muscleGroup && filters.muscleGroup !== 'all') {
      where.primaryMuscle = filters.muscleGroup;
    }

    // Filter by equipment
    if (filters.equipment && filters.equipment !== 'all') {
      where.equipment = filters.equipment;
    }

    // Filter by difficulty
    if (filters.difficulty && filters.difficulty !== 'all') {
      where.difficulty = filters.difficulty;
    }

    // Filter by category
    if (filters.category && filters.category !== 'all') {
      where.category = filters.category;
    }

    // Filter by visibility
    if (filters.visibility && filters.visibility !== 'all') {
      where.visibility = filters.visibility;
    }

    // Filter by favorites only
    if (filters.favoritesOnly === 'true') {
      where.favorites = {
        some: {
          userId,
        }
      };
    }

    // Execute query
    const [total, records] = await Promise.all([
      this.prisma.exercise.count({ where }),
      this.prisma.exercise.findMany({
        where,
        include: {
          favorites: {
            where: { userId },
          }
        },
        orderBy: [
          { source: 'asc' },
          { name: 'asc' }
        ],
        skip,
        take: limit,
      }),
    ]);

    // Format list mapping favorited state
    const items = records.map((ex) => {
      const { favorites, ...rest } = ex;
      return {
        ...rest,
        isFavorite: favorites.length > 0,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getExercise(id: string, userId: string, organizationId: string) {
    const ex = await this.prisma.exercise.findUnique({
      where: { id },
      include: {
        favorites: {
          where: { userId },
        }
      }
    });

    if (!ex) {
      throw new NotFoundException('Exercise not found');
    }

    // Scoping check
    if (ex.organizationId && ex.organizationId !== organizationId) {
      throw new ForbiddenException('You do not have access to this custom exercise');
    }

    const { favorites, ...rest } = ex;
    return {
      ...rest,
      isFavorite: favorites.length > 0,
    };
  }

  async createExercise(organizationId: string, dto: CreateExerciseDto) {
    return this.prisma.exercise.create({
      data: {
        ...dto,
        source: 'Custom',
        organizationId,
        verified: false,
      }
    });
  }

  async updateExercise(id: string, organizationId: string, dto: UpdateExerciseDto) {
    const ex = await this.prisma.exercise.findUnique({ where: { id } });
    if (!ex) {
      throw new NotFoundException('Exercise not found');
    }

    if (ex.organizationId !== organizationId) {
      throw new ForbiddenException('Only custom organization exercises can be edited');
    }

    return this.prisma.exercise.update({
      where: { id },
      data: dto,
    });
  }

  async deleteExercise(id: string, organizationId: string) {
    const ex = await this.prisma.exercise.findUnique({ where: { id } });
    if (!ex) {
      throw new NotFoundException('Exercise not found');
    }

    if (ex.organizationId !== organizationId) {
      throw new ForbiddenException('Only custom organization exercises can be deleted');
    }

    await this.prisma.exercise.delete({ where: { id } });
    return { success: true };
  }

  async toggleFavorite(id: string, userId: string) {
    const ex = await this.prisma.exercise.findUnique({ where: { id } });
    if (!ex) {
      throw new NotFoundException('Exercise not found');
    }

    const fav = await this.prisma.exerciseFavorite.findUnique({
      where: {
        userId_exerciseId: {
          userId,
          exerciseId: id,
        }
      }
    });

    if (fav) {
      await this.prisma.exerciseFavorite.delete({
        where: { id: fav.id }
      });
      return { favorited: false };
    } else {
      await this.prisma.exerciseFavorite.create({
        data: {
          userId,
          exerciseId: id,
        }
      });
      return { favorited: true };
    }
  }

  async importToOrganization(id: string, organizationId: string, creatorName: string) {
    const ex = await this.prisma.exercise.findUnique({ where: { id } });
    if (!ex) {
      throw new NotFoundException('Original exercise not found');
    }

    // Create a Custom copy of this exercise in the target organization library
    const copy = await this.prisma.exercise.create({
      data: {
        name: `${ex.name} (Copy)`,
        description: ex.description,
        instructions: ex.instructions,
        primaryMuscle: ex.primaryMuscle,
        secondaryMuscles: ex.secondaryMuscles,
        equipment: ex.equipment,
        difficulty: ex.difficulty,
        category: ex.category,
        movementPattern: ex.movementPattern,
        gifUrl: ex.gifUrl,
        videoUrl: ex.videoUrl,
        safetyTips: ex.safetyTips,
        trainerNotes: `Imported copy. Original creator: ${ex.creator || ex.source}.`,
        caloriesBurned: ex.caloriesBurned,
        metValue: ex.metValue,
        visibility: 'Private',
        source: 'Custom',
        organizationId,
        verified: false,
        creator: creatorName,
      }
    });

    return copy;
  }

  async syncExternal() {
    // Mock triggering a sync with external exercise database
    // We add 2 new external exercises to pretend we downloaded updates
    const ext1 = await this.prisma.exercise.findFirst({ where: { name: 'Assault Bike Sprint' } });
    if (!ext1) {
      await this.prisma.exercise.create({
        data: {
          name: "Assault Bike Sprint",
          description: "High-intensity cardio exercise to boost conditioning and cardiovascular output.",
          category: "HIIT",
          primaryMuscle: "Full Body",
          secondaryMuscles: ["Quadriceps", "Shoulders"],
          equipment: "Machine",
          difficulty: "Intermediate",
          movementPattern: "Push",
          instructions: [
            "Adjust the seat so your knees have a slight bend at the bottom.",
            "Pedal with legs while pushing and pulling handles with arms.",
            "Drive hard to raise intensity."
          ],
          safetyTips: ["Keep core tight", "Maintain linear leg movement"],
          source: "External",
          sourceId: "ext-assaultbike",
          downloads: 1200,
        }
      });
    }
    return { success: true, count: ext1 ? 0 : 1 };
  }

  async getAnalytics(organizationId: string, userId: string) {
    const [total, official, custom, external, favorites] = await Promise.all([
      // Total visible to this organization
      this.prisma.exercise.count({
        where: {
          OR: [{ organizationId: null }, { organizationId }]
        }
      }),
      // Official
      this.prisma.exercise.count({ where: { source: 'Official' } }),
      // Custom organization
      this.prisma.exercise.count({ where: { source: 'Custom', organizationId } }),
      // External
      this.prisma.exercise.count({ where: { source: 'External' } }),
      // Favorites for this user
      this.prisma.exerciseFavorite.count({ where: { userId } }),
    ]);

    // Trending: top exercises by useCount
    const trending = await this.prisma.exercise.findMany({
      where: {
        OR: [{ organizationId: null }, { organizationId }]
      },
      orderBy: { useCount: 'desc' },
      take: 5,
    });

    // Most assigned exercises
    const mostAssigned = await this.prisma.exercise.findMany({
      where: {
        OR: [{ organizationId: null }, { organizationId }]
      },
      orderBy: { assignCount: 'desc' },
      take: 5,
    });

    // Recently imported/added custom exercises
    const recentlyAdded = await this.prisma.exercise.findMany({
      where: { source: 'Custom', organizationId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return {
      summary: {
        total,
        official,
        custom,
        external,
        favorites,
      },
      trending: trending.map(t => ({ id: t.id, name: t.name, primaryMuscle: t.primaryMuscle, useCount: t.useCount, source: t.source })),
      mostAssigned: mostAssigned.map(m => ({ id: m.id, name: m.name, equipment: m.equipment, assignCount: m.assignCount, source: m.source })),
      recentlyAdded: recentlyAdded.map(r => ({ id: r.id, name: r.name, createdAt: r.createdAt })),
    };
  }

  async handleBulkAction(organizationId: string, userId: string, dto: BulkActionDto) {
    const { ids, action, value } = dto;

    if (action === 'favorite') {
      for (const id of ids) {
        const exists = await this.prisma.exerciseFavorite.findUnique({
          where: { userId_exerciseId: { userId, exerciseId: id } }
        });
        if (!exists) {
          await this.prisma.exerciseFavorite.create({
            data: { userId, exerciseId: id }
          });
        }
      }
      return { success: true };
    }

    if (action === 'unfavorite') {
      await this.prisma.exerciseFavorite.deleteMany({
        where: {
          userId,
          exerciseId: { in: ids }
        }
      });
      return { success: true };
    }

    if (action === 'delete') {
      // Scoping security: only delete if the exercise belongs to this organization
      const count = await this.prisma.exercise.deleteMany({
        where: {
          id: { in: ids },
          organizationId,
        }
      });
      return { success: true, count: count.count };
    }

    if (action === 'category') {
      const count = await this.prisma.exercise.updateMany({
        where: {
          id: { in: ids },
          organizationId,
        },
        data: {
          category: value,
        }
      });
      return { success: true, count: count.count };
    }

    return { success: false, message: 'Action not supported' };
  }
}
