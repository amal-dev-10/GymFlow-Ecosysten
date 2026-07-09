import { Module } from '@nestjs/common';
import { PlatformGlobalSettingsService } from './platform-global-settings.service';
import { PlatformGlobalSettingsController, PlatformGlobalSettingsPublicController } from './platform-global-settings.controller';
import { PlatformAdminGuard } from '../platform-plans/guards/platform-admin.guard';
import { PlatformPermissionGuard } from '../platform-roles/guards/platform-permission.guard';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PlatformRolesModule } from '../platform-roles/platform-roles.module';

@Module({
  imports: [AuditLogsModule, PlatformRolesModule],
  providers: [PlatformGlobalSettingsService, PlatformAdminGuard, PlatformPermissionGuard],
  controllers: [PlatformGlobalSettingsController, PlatformGlobalSettingsPublicController],
  exports: [PlatformGlobalSettingsService],
})
export class PlatformGlobalSettingsModule {}
