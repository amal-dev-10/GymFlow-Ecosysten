import { Module } from '@nestjs/common';
import { PlatformAutomationService } from './platform-automation.service';
import { PlatformAutomationController } from './platform-automation.controller';
import { PlatformAdminGuard } from '../platform-plans/guards/platform-admin.guard';
import { PlatformPermissionGuard } from '../platform-roles/guards/platform-permission.guard';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PlatformRolesModule } from '../platform-roles/platform-roles.module';

@Module({
  imports: [AuditLogsModule, PlatformRolesModule],
  providers: [PlatformAutomationService, PlatformAdminGuard, PlatformPermissionGuard],
  controllers: [PlatformAutomationController],
  exports: [PlatformAutomationService],
})
export class PlatformAutomationModule {}
