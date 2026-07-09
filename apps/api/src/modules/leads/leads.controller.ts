import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { CreateLeadSourceDto } from './dto/create-lead-source.dto';
import { CreateLeadStatusDto } from './dto/create-lead-status.dto';
import { CreateLeadActivityDto } from './dto/create-lead-activity.dto';
import { AssignLeadDto } from './dto/assign-lead.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { TenantGuard } from '../../core/guards/tenant.guard';
import { PermissionsGuard } from '../../core/guards/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';

@Controller('v1/leads')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  // --- Lead Sources ---
  @RequirePermissions({ resource: 'leads', action: 'write' })
  @Post('sources')
  @HttpCode(HttpStatus.CREATED)
  createLeadSource(@Req() req, @Body() dto: CreateLeadSourceDto) {
    return this.leadsService.createLeadSource(req.organizationId, dto);
  }

  @RequirePermissions({ resource: 'leads', action: 'read' })
  @Get('sources')
  getLeadSources(@Req() req) {
    return this.leadsService.getLeadSources(req.organizationId);
  }

  // --- Lead Statuses ---
  @RequirePermissions({ resource: 'leads', action: 'write' })
  @Post('statuses')
  @HttpCode(HttpStatus.CREATED)
  createLeadStatus(@Req() req, @Body() dto: CreateLeadStatusDto) {
    return this.leadsService.createLeadStatus(req.organizationId, dto);
  }

  @RequirePermissions({ resource: 'leads', action: 'read' })
  @Get('statuses')
  getLeadStatuses(@Req() req) {
    return this.leadsService.getLeadStatuses(req.organizationId);
  }

  // --- Leads ---
  @RequirePermissions({ resource: 'leads', action: 'write' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createLead(@Req() req, @Body() dto: CreateLeadDto) {
    return this.leadsService.createLead(req.organizationId, dto);
  }

  @RequirePermissions({ resource: 'leads', action: 'read' })
  @Get()
  getLeads(
    @Req() req,
    @Query('gymId') gymId?: string,
    @Query('statusId') statusId?: string,
    @Query('sourceId') sourceId?: string
  ) {
    return this.leadsService.getLeads(req.organizationId, { gymId, statusId, sourceId });
  }

  @RequirePermissions({ resource: 'leads', action: 'read' })
  @Get(':id')
  getLeadById(@Req() req, @Param('id') id: string) {
    return this.leadsService.getLeadById(req.organizationId, id);
  }

  @RequirePermissions({ resource: 'leads', action: 'write' })
  @Post(':id/assign')
  @HttpCode(HttpStatus.CREATED)
  assignLead(@Req() req, @Param('id') id: string, @Body() dto: AssignLeadDto) {
    return this.leadsService.assignLead(req.organizationId, id, dto);
  }

  @RequirePermissions({ resource: 'leads', action: 'write' })
  @Post(':id/activities')
  @HttpCode(HttpStatus.CREATED)
  createLeadActivity(@Req() req, @Param('id') id: string, @Body() dto: CreateLeadActivityDto) {
    return this.leadsService.createLeadActivity(req.organizationId, id, dto);
  }

  @RequirePermissions({ resource: 'leads', action: 'read' })
  @Get(':id/activities')
  getLeadActivities(@Req() req, @Param('id') id: string) {
    return this.leadsService.getLeadActivities(req.organizationId, id);
  }
}
