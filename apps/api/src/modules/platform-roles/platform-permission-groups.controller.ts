import { Controller, Get, Post, Put, Delete, Param, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { PlatformPermissionGroupsService } from './platform-permission-groups.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../platform-plans/guards/platform-admin.guard';
import { RequirePlatformRoles } from '../platform-plans/decorators/require-platform-roles.decorator';
import { CreatePermissionGroupDto, UpdatePermissionGroupDto } from './dto/permission-group.dto';

@Controller('v1/platform/permission-groups')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformPermissionGroupsController {
  constructor(private readonly service: PlatformPermissionGroupsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @RequirePlatformRoles('SUPER_ADMIN')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req, @Body() dto: CreatePermissionGroupDto) {
    return this.service.create(dto, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN')
  @Put(':id')
  update(@Param('id') id: string, @Req() req, @Body() dto: UpdatePermissionGroupDto) {
    return this.service.update(id, dto, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.service.remove(id, req.user.userId);
  }
}
