import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { PlatformAutomationService } from './platform-automation.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../platform-plans/guards/platform-admin.guard';
import { PlatformPermissionGuard } from '../platform-roles/guards/platform-permission.guard';
import { RequirePlatformPermission } from '../platform-roles/decorators/require-platform-permission.decorator';
import { ListJobsDto } from './dto/list-jobs.dto';
import { CreateJobDto, UpdateJobDto } from './dto/job.dto';
import { ListRunsDto } from './dto/list-runs.dto';

const actorName = (req: any) => req.user.fullName || req.user.email || 'Platform Admin';

@Controller('v1/platform/automation')
@UseGuards(JwtAuthGuard, PlatformAdminGuard, PlatformPermissionGuard)
export class PlatformAutomationController {
  constructor(private readonly service: PlatformAutomationService) {}

  @RequirePlatformPermission('automation.view')
  @Get('dashboard')
  getDashboard() {
    return this.service.getDashboard();
  }

  @RequirePlatformPermission('automation.view')
  @Get('workflows')
  listWorkflows() {
    return this.service.listWorkflows();
  }

  @RequirePlatformPermission('automation.view')
  @Get('schedules')
  listSchedules() {
    return this.service.listSchedules();
  }

  @RequirePlatformPermission('automation.view')
  @Get('queues')
  listQueues() {
    return this.service.listQueues();
  }

  @RequirePlatformPermission('automation.manage_jobs')
  @Put('queues/:key')
  updateQueue(@Param('key') key: string, @Req() req, @Body('isActive') isActive: boolean) {
    return this.service.updateQueue(key, isActive, req.user.userId, actorName(req));
  }

  @RequirePlatformPermission('automation.view')
  @Get('execution-history')
  listExecutionHistory(@Query() query: ListRunsDto) {
    return this.service.listExecutionHistory(query);
  }

  @RequirePlatformPermission('automation.view')
  @Get('failed-jobs')
  listFailedJobs(@Query() query: ListRunsDto) {
    return this.service.listFailedJobs(query);
  }

  @RequirePlatformPermission('automation.manage_failures')
  @Post('runs/:id/retry')
  retryRun(@Param('id') id: string, @Req() req) {
    return this.service.retryRun(id, req.user.userId, actorName(req));
  }

  @RequirePlatformPermission('automation.manage_failures')
  @Post('runs/:id/ignore')
  ignoreRun(@Param('id') id: string, @Req() req) {
    return this.service.ignoreRun(id, req.user.userId, actorName(req));
  }

  @RequirePlatformPermission('automation.view')
  @Get('jobs')
  listJobs(@Query() query: ListJobsDto) {
    return this.service.listJobs(query);
  }

  @RequirePlatformPermission('automation.manage_jobs')
  @Post('jobs')
  createJob(@Req() req, @Body() dto: CreateJobDto) {
    return this.service.createJob(dto, req.user.userId, actorName(req));
  }

  @RequirePlatformPermission('automation.view')
  @Get('jobs/:id')
  getJob(@Param('id') id: string) {
    return this.service.getJob(id);
  }

  @RequirePlatformPermission('automation.manage_jobs')
  @Put('jobs/:id')
  updateJob(@Param('id') id: string, @Req() req, @Body() dto: UpdateJobDto) {
    return this.service.updateJob(id, dto, req.user.userId, actorName(req));
  }

  @RequirePlatformPermission('automation.manage_jobs')
  @Post('jobs/:id/pause')
  pauseJob(@Param('id') id: string, @Req() req) {
    return this.service.pauseJob(id, req.user.userId, actorName(req));
  }

  @RequirePlatformPermission('automation.manage_jobs')
  @Post('jobs/:id/resume')
  resumeJob(@Param('id') id: string, @Req() req) {
    return this.service.resumeJob(id, req.user.userId, actorName(req));
  }

  @RequirePlatformPermission('automation.manage_jobs')
  @Post('jobs/:id/disable')
  disableJob(@Param('id') id: string, @Req() req) {
    return this.service.disableJob(id, req.user.userId, actorName(req));
  }

  @RequirePlatformPermission('automation.run_now')
  @Post('jobs/:id/run-now')
  runJobNow(@Param('id') id: string, @Req() req) {
    return this.service.runJobNow(id, req.user.userId, actorName(req));
  }
}
