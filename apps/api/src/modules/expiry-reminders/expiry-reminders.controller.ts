import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ExpiryRemindersService } from './expiry-reminders.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { TenantGuard } from '../../core/guards/tenant.guard';
import { PermissionsGuard } from '../../core/guards/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { DispatchReminderDto } from './dto/dispatch-reminder.dto';

@Controller('v1/memberships/reminder-rules')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class ExpiryRemindersController {
  constructor(private readonly service: ExpiryRemindersService) {}

  @RequirePermissions({ resource: 'membership', action: 'view_plans' })
  @Get()
  listRules(@Req() req) {
    return this.service.listRules(req.organizationId);
  }

  @RequirePermissions({ resource: 'membership', action: 'update_plans' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createRule(@Req() req, @Body() dto: CreateRuleDto) {
    return this.service.createRule(req.organizationId, dto, req.user?.userId);
  }

  @RequirePermissions({ resource: 'membership', action: 'update_plans' })
  @Put(':id')
  updateRule(@Req() req, @Param('id') id: string, @Body() dto: UpdateRuleDto) {
    return this.service.updateRule(req.organizationId, id, dto, req.user?.userId);
  }

  @RequirePermissions({ resource: 'membership', action: 'update_plans' })
  @Delete(':id')
  deleteRule(@Req() req, @Param('id') id: string) {
    return this.service.deleteRule(req.organizationId, id, req.user?.userId);
  }

  @RequirePermissions({ resource: 'membership', action: 'update_plans' })
  @Post('dispatch')
  @HttpCode(HttpStatus.OK)
  dispatch(@Req() req, @Body() dto: DispatchReminderDto) {
    return this.service.dispatch(req.organizationId, dto, req.user?.userId);
  }

  @RequirePermissions({ resource: 'membership', action: 'view_plans' })
  @Get('logs')
  listLogs(@Req() req, @Query('limit') limit?: string) {
    return this.service.listLogs(req.organizationId, limit ? parseInt(limit) : 50);
  }

  @RequirePermissions({ resource: 'membership', action: 'view_plans' })
  @Get('channel-config')
  getChannelConfig(@Req() req) {
    return this.service.getChannelConfig(req.organizationId);
  }
}
