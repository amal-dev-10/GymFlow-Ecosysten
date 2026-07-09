import { Module } from '@nestjs/common';
import { PlatformNotificationsService } from './platform-notifications.service';
import { PlatformNotificationsController } from './platform-notifications.controller';
import { PlatformAdminGuard } from '../platform-plans/guards/platform-admin.guard';
import { PlatformPermissionGuard } from '../platform-roles/guards/platform-permission.guard';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PlatformRolesModule } from '../platform-roles/platform-roles.module';

@Module({
  imports: [AuditLogsModule, PlatformRolesModule],
  providers: [PlatformNotificationsService, PlatformAdminGuard, PlatformPermissionGuard],
  controllers: [PlatformNotificationsController],
  exports: [PlatformNotificationsService],
})
export class PlatformNotificationsModule {}
