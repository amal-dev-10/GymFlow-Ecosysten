import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PlatformPermissionsService } from './platform-permissions.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../platform-plans/guards/platform-admin.guard';

@Controller('v1/platform')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformPermissionsController {
  constructor(private readonly service: PlatformPermissionsService) {}

  @Get('permission-categories')
  listCategories() {
    return this.service.listCategories();
  }

  @Get('permission-actions')
  listActions() {
    return this.service.listActions();
  }

  @Get('permissions/tree')
  tree() {
    return this.service.tree();
  }

  @Get('permissions')
  search(@Query() query: { search?: string; categoryKey?: string; actionKey?: string; roleId?: string }) {
    return this.service.search(query);
  }
}
