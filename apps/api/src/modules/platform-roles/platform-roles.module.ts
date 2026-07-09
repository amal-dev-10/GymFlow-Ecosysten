import { Module } from '@nestjs/common';
import { PlatformRolesService } from './platform-roles.service';
import { PlatformRolesController } from './platform-roles.controller';
import { PlatformPermissionsService } from './platform-permissions.service';
import { PlatformPermissionsController } from './platform-permissions.controller';
import { PlatformPermissionGroupsService } from './platform-permission-groups.service';
import { PlatformPermissionGroupsController } from './platform-permission-groups.controller';
import { PlatformRoleTemplatesService } from './platform-role-templates.service';
import { PlatformRoleTemplatesController } from './platform-role-templates.controller';
import { PlatformAuthorizationService } from './platform-authorization.service';
import { PlatformPermissionGuard } from './guards/platform-permission.guard';
import { PlatformAdminGuard } from '../platform-plans/guards/platform-admin.guard';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  providers: [
    PlatformRolesService,
    PlatformPermissionsService,
    PlatformPermissionGroupsService,
    PlatformRoleTemplatesService,
    PlatformAuthorizationService,
    PlatformPermissionGuard,
    PlatformAdminGuard,
  ],
  controllers: [
    PlatformRolesController,
    PlatformPermissionsController,
    PlatformPermissionGroupsController,
    PlatformRoleTemplatesController,
  ],
  exports: [PlatformAuthorizationService],
})
export class PlatformRolesModule {}
