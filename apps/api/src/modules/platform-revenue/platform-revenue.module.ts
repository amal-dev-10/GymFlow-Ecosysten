import { Module } from '@nestjs/common';
import { PlatformRevenueService } from './platform-revenue.service';
import { PlatformRevenueController } from './platform-revenue.controller';
import { PlatformAdminGuard } from '../platform-plans/guards/platform-admin.guard';
import { PlatformPermissionGuard } from '../platform-roles/guards/platform-permission.guard';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PlatformRolesModule } from '../platform-roles/platform-roles.module';
import { PlatformOrganizationsModule } from '../platform-organizations/platform-organizations.module';

@Module({
  imports: [AuditLogsModule, PlatformRolesModule, PlatformOrganizationsModule],
  providers: [PlatformRevenueService, PlatformAdminGuard, PlatformPermissionGuard],
  controllers: [PlatformRevenueController],
})
export class PlatformRevenueModule {}
