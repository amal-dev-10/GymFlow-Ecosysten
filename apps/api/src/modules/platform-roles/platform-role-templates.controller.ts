import { Controller, Get, Post, Put, Delete, Param, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { PlatformRoleTemplatesService } from './platform-role-templates.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../platform-plans/guards/platform-admin.guard';
import { RequirePlatformRoles } from '../platform-plans/decorators/require-platform-roles.decorator';
import { CreateRoleTemplateDto, UpdateRoleTemplateDto } from './dto/role-template.dto';

@Controller('v1/platform/role-templates')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformRoleTemplatesController {
  constructor(private readonly service: PlatformRoleTemplatesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @RequirePlatformRoles('SUPER_ADMIN')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req, @Body() dto: CreateRoleTemplateDto) {
    return this.service.create(dto, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN')
  @Put(':id')
  update(@Param('id') id: string, @Req() req, @Body() dto: UpdateRoleTemplateDto) {
    return this.service.update(id, dto, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.service.remove(id, req.user.userId);
  }
}
