import { Controller, Post, Body, Req, UseGuards, Param, HttpCode, HttpStatus, Get, Query, Patch, Delete } from '@nestjs/common';
import { ExercisesService } from './exercises.service';
import { CreateExerciseDto, UpdateExerciseDto, BulkActionDto } from './dto/exercises.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { TenantGuard } from '../../core/guards/tenant.guard';
import { PermissionsGuard } from '../../core/guards/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';

@Controller('v1/exercises')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @RequirePermissions({ resource: 'workout', action: 'view' })
  @Get()
  @HttpCode(HttpStatus.OK)
  listExercises(
    @Req() req,
    @Query('search') search?: string,
    @Query('source') source?: string,
    @Query('muscleGroup') muscleGroup?: string,
    @Query('equipment') equipment?: string,
    @Query('difficulty') difficulty?: string,
    @Query('category') category?: string,
    @Query('visibility') visibility?: string,
    @Query('favoritesOnly') favoritesOnly?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.exercisesService.listExercises(req.organizationId, req.user.id, {
      search,
      source,
      muscleGroup,
      equipment,
      difficulty,
      category,
      visibility,
      favoritesOnly,
      page,
      limit,
    });
  }

  @RequirePermissions({ resource: 'workout', action: 'view' })
  @Get('analytics')
  @HttpCode(HttpStatus.OK)
  getAnalytics(@Req() req) {
    return this.exercisesService.getAnalytics(req.organizationId, req.user.id);
  }

  @RequirePermissions({ resource: 'workout', action: 'view' })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  getExercise(@Req() req, @Param('id') id: string) {
    return this.exercisesService.getExercise(id, req.user.id, req.organizationId);
  }

  @RequirePermissions({ resource: 'workout', action: 'create' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createExercise(@Req() req, @Body() dto: CreateExerciseDto) {
    return this.exercisesService.createExercise(req.organizationId, dto);
  }

  @RequirePermissions({ resource: 'workout', action: 'update' })
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  updateExercise(@Req() req, @Param('id') id: string, @Body() dto: UpdateExerciseDto) {
    return this.exercisesService.updateExercise(id, req.organizationId, dto);
  }

  @RequirePermissions({ resource: 'workout', action: 'delete' })
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  deleteExercise(@Req() req, @Param('id') id: string) {
    return this.exercisesService.deleteExercise(id, req.organizationId);
  }

  @RequirePermissions({ resource: 'workout', action: 'view' })
  @Post(':id/favorite')
  @HttpCode(HttpStatus.OK)
  toggleFavorite(@Req() req, @Param('id') id: string) {
    return this.exercisesService.toggleFavorite(id, req.user.id);
  }

  @RequirePermissions({ resource: 'workout', action: 'create' })
  @Post(':id/import')
  @HttpCode(HttpStatus.CREATED)
  importToOrganization(@Req() req, @Param('id') id: string) {
    return this.exercisesService.importToOrganization(id, req.organizationId, req.user.fullName || 'Staff User');
  }

  @RequirePermissions({ resource: 'workout', action: 'update' })
  @Post('sync-external')
  @HttpCode(HttpStatus.OK)
  syncExternal() {
    return this.exercisesService.syncExternal();
  }

  @RequirePermissions({ resource: 'workout', action: 'update' })
  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  handleBulkAction(@Req() req, @Body() dto: BulkActionDto) {
    return this.exercisesService.handleBulkAction(req.organizationId, req.user.id, dto);
  }
}
