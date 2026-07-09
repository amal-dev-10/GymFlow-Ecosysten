import { Controller, Post, Get, Body, Req, UseGuards, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { TenantGuard } from '../../core/guards/tenant.guard';
import { PermissionsGuard } from '../../core/guards/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';

@Controller('v1/attendance')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @RequirePermissions({ resource: 'attendance', action: 'check_in' })
  @Post('check-in')
  @HttpCode(HttpStatus.OK)
  checkIn(
    @Req() req,
    @Body()
    dto: {
      memberId?: string;
      gymId: string;
      method: string;
      memberName?: string;
    },
  ) {
    return this.attendanceService.checkIn(req.organizationId, dto, req.user?.userId);
  }

  @RequirePermissions({ resource: 'attendance', action: 'check_out' })
  @Post('check-out/:id')
  @HttpCode(HttpStatus.OK)
  checkOut(@Req() req, @Param('id') id: string) {
    return this.attendanceService.checkOut(req.organizationId, id, req.user?.userId);
  }

  @RequirePermissions({ resource: 'attendance', action: 'check_out' })
  @Post('bulk-checkout')
  @HttpCode(HttpStatus.OK)
  bulkCheckOut(@Req() req, @Body('ids') ids: string[]) {
    return this.attendanceService.bulkCheckOut(req.organizationId, ids, req.user?.userId);
  }

  @RequirePermissions({ resource: 'attendance', action: 'correct' })
  @Post('correction/:id')
  @HttpCode(HttpStatus.OK)
  correctRecord(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: { checkInTime: string; checkOutTime: string; reason: string },
  ) {
    return this.attendanceService.correctRecord(req.organizationId, id, dto, req.user?.userId);
  }

  @RequirePermissions({ resource: 'attendance', action: 'view' })
  @Get('active')
  @HttpCode(HttpStatus.OK)
  listActive(@Req() req, @Query('gymId') gymId: string) {
    return this.attendanceService.listActive(req.organizationId, gymId);
  }

  @RequirePermissions({ resource: 'attendance', action: 'view' })
  @Get('logs')
  @HttpCode(HttpStatus.OK)
  listLogs(@Req() req, @Query('gymId') gymId: string) {
    return this.attendanceService.listLogs(req.organizationId, gymId);
  }

  @RequirePermissions({ resource: 'attendance', action: 'view' })
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  getStats(@Req() req, @Query('gymId') gymId: string) {
    return this.attendanceService.getStats(req.organizationId, gymId);
  }

  @RequirePermissions({ resource: 'attendance', action: 'view' })
  @Get('search')
  @HttpCode(HttpStatus.OK)
  searchRecords(
    @Req() req,
    @Query()
    query: {
      query?: string;
      gymId?: string;
      status?: string;
      method?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
    },
  ) {
    return this.attendanceService.searchRecords(req.organizationId, query);
  }

  @RequirePermissions({ resource: 'attendance', action: 'view' })
  @Get('analytics')
  @HttpCode(HttpStatus.OK)
  getAnalytics(@Req() req, @Query('gymId') gymId?: string) {
    return this.attendanceService.getAnalytics(req.organizationId, gymId);
  }

  @RequirePermissions({ resource: 'attendance', action: 'view' })
  @Get('exceptions')
  @HttpCode(HttpStatus.OK)
  getExceptions(@Req() req, @Query('gymId') gymId?: string) {
    return this.attendanceService.getExceptions(req.organizationId, gymId);
  }

  @RequirePermissions({ resource: 'attendance', action: 'correct' })
  @Post('bulk-correct')
  @HttpCode(HttpStatus.OK)
  bulkCorrect(
    @Req() req,
    @Body()
    dto: {
      ids: string[];
      checkInTime: string;
      checkOutTime: string;
      reason: string;
    },
  ) {
    return this.attendanceService.bulkCorrect(req.organizationId, dto, req.user?.userId);
  }

  @RequirePermissions({ resource: 'attendance', action: 'view' })
  @Get('validation/stats')
  @HttpCode(HttpStatus.OK)
  getValidationStats(@Req() req, @Query('gymId') gymId: string) {
    return this.attendanceService.getValidationStats(req.organizationId, gymId);
  }

  @RequirePermissions({ resource: 'attendance', action: 'view' })
  @Get('validation/rules')
  @HttpCode(HttpStatus.OK)
  getValidationRules(@Req() req, @Query('gymId') gymId: string) {
    return this.attendanceService.getValidationRules(req.organizationId, gymId);
  }

  @RequirePermissions({ resource: 'attendance', action: 'manage_settings' })
  @Post('validation/rules')
  @HttpCode(HttpStatus.OK)
  saveValidationRules(
    @Req() req,
    @Body() dto: { gymId: string; rules: any },
  ) {
    return this.attendanceService.saveValidationRules(req.organizationId, dto.gymId, dto.rules, req.user?.userId);
  }

  @RequirePermissions({ resource: 'attendance', action: 'override' })
  @Post('validation/override')
  @HttpCode(HttpStatus.OK)
  executeOverride(
    @Req() req,
    @Body()
    dto: {
      memberId: string;
      gymId: string;
      reason: string;
      approverName: string;
      notes?: string;
      deviceUsed?: string;
    },
  ) {
    return this.attendanceService.executeOverride(req.organizationId, dto);
  }

  @RequirePermissions({ resource: 'attendance', action: 'view' })
  @Post('validation/check')
  @HttpCode(HttpStatus.OK)
  validateCheckIn(
    @Req() req,
    @Body() dto: { gymId: string; memberId: string },
  ) {
    return this.attendanceService.validateCheckIn(req.organizationId, dto.gymId, dto.memberId);
  }
}
