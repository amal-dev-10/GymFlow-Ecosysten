import { Controller, Get, Post, Param, Body, Query, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { PlatformOrganizationsService } from './platform-organizations.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../platform-plans/guards/platform-admin.guard';
import { RequirePlatformRoles } from '../platform-plans/decorators/require-platform-roles.decorator';
import { ListOrganizationsDto } from './dto/list-organizations.dto';
import { SuspendOrganizationDto } from './dto/suspend-organization.dto';
import { BulkActionDto } from './dto/bulk-action.dto';

@Controller('v1/platform/organizations')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformOrganizationsController {
  constructor(private readonly service: PlatformOrganizationsService) {}

  // --- READ (any platform admin) ---

  @Get('stats')
  getStats() {
    return this.service.getStats();
  }

  @Get('insights')
  getInsights() {
    return this.service.getInsights();
  }

  @Get('countries')
  listCountries() {
    return this.service.listCountries();
  }

  @Get()
  list(@Req() req, @Query() query: ListOrganizationsDto) {
    return this.service.list(query, req.user.userId);
  }

  @Post('export')
  @HttpCode(HttpStatus.OK)
  recordExport(@Req() req, @Body() body: { format?: string; count?: number }) {
    return this.service.recordExport(req.user.userId, body?.format || 'csv', body?.count || 0);
  }

  // --- IMPERSONATION (Super Admin / Support) ---

  @RequirePlatformRoles('SUPER_ADMIN', 'SUPPORT')
  @Post(':id/impersonate')
  @HttpCode(HttpStatus.OK)
  impersonate(@Param('id') id: string, @Req() req) {
    return this.service.impersonate(id, req.user.userId, req.platformRole);
  }

  // --- LIFECYCLE (Super Admin) ---

  @RequirePlatformRoles('SUPER_ADMIN')
  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  suspend(@Param('id') id: string, @Req() req, @Body() dto: SuspendOrganizationDto) {
    return this.service.suspend(id, dto, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN')
  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  activate(@Param('id') id: string, @Req() req) {
    return this.service.activate(id, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN')
  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  archive(@Param('id') id: string, @Req() req) {
    return this.service.archive(id, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN')
  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  bulk(@Req() req, @Body() dto: BulkActionDto) {
    return this.service.bulk(dto, req.user.userId);
  }
}
