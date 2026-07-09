import { Controller, Post, Body, Req, UseGuards, Param, HttpCode, HttpStatus, Get, Query, Patch, Delete } from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import { CreateWorkoutDto, UpdateWorkoutDto, BulkWorkoutActionDto } from './dto/workouts.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { TenantGuard } from '../../core/guards/tenant.guard';
import { PermissionsGuard } from '../../core/guards/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';

@Controller('v1/workouts')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @RequirePermissions({ resource: 'workout', action: 'view' })
  @Get()
  @HttpCode(HttpStatus.OK)
  listWorkouts(
    @Req() req,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('difficulty') difficulty?: string,
    @Query('status') status?: string,
    @Query('isTemplate') isTemplate?: string,
    @Query('isFavorite') isFavorite?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const isTemp = isTemplate !== undefined ? isTemplate === 'true' : undefined;
    const isFav = isFavorite !== undefined ? isFavorite === 'true' : undefined;
    
    return this.workoutsService.listWorkouts(req.organizationId, {
      search,
      type,
      difficulty,
      status,
      isTemplate: isTemp,
      isFavorite: isFav,
      page,
      limit,
    });
  }

  @RequirePermissions({ resource: 'workout', action: 'view' })
  @Get('analytics')
  @HttpCode(HttpStatus.OK)
  getAnalytics(@Req() req) {
    return this.workoutsService.getAnalytics(req.organizationId);
  }

  @RequirePermissions({ resource: 'workout', action: 'view' })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  getWorkout(@Req() req, @Param('id') id: string) {
    return this.workoutsService.getWorkout(id, req.organizationId);
  }

  @RequirePermissions({ resource: 'workout', action: 'create' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createWorkout(@Req() req, @Body() dto: CreateWorkoutDto) {
    return this.workoutsService.createWorkout(req.organizationId, req.user.id, dto);
  }

  @RequirePermissions({ resource: 'workout', action: 'update' })
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  updateWorkout(@Req() req, @Param('id') id: string, @Body() dto: UpdateWorkoutDto) {
    return this.workoutsService.updateWorkout(id, req.organizationId, dto);
  }

  @RequirePermissions({ resource: 'workout', action: 'delete' })
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  softDeleteWorkout(@Req() req, @Param('id') id: string) {
    return this.workoutsService.softDeleteWorkout(id, req.organizationId);
  }

  @RequirePermissions({ resource: 'workout', action: 'create' })
  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  duplicateWorkout(@Req() req, @Param('id') id: string) {
    return this.workoutsService.duplicateWorkout(id, req.organizationId, req.user.id);
  }

  @RequirePermissions({ resource: 'workout', action: 'view' })
  @Get(':id/versions')
  @HttpCode(HttpStatus.OK)
  getVersions(@Req() req, @Param('id') id: string) {
    return this.workoutsService.getVersions(id, req.organizationId);
  }

  @RequirePermissions({ resource: 'workout', action: 'update' })
  @Post(':id/versions/:vId/restore')
  @HttpCode(HttpStatus.OK)
  restoreVersion(@Req() req, @Param('id') id: string, @Param('vId') vId: string) {
    return this.workoutsService.restoreVersion(id, vId, req.organizationId);
  }

  @RequirePermissions({ resource: 'workout', action: 'update' })
  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  bulkAction(@Req() req, @Body() dto: BulkWorkoutActionDto) {
    return this.workoutsService.bulkAction(req.organizationId, dto);
  }
}
