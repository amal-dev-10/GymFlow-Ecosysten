import { Module } from '@nestjs/common';
import { PlatformSupportService } from './platform-support.service';
import { PlatformSupportController } from './platform-support.controller';
import { PlatformAdminGuard } from '../platform-plans/guards/platform-admin.guard';
import { PlatformPermissionGuard } from '../platform-roles/guards/platform-permission.guard';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PlatformRolesModule } from '../platform-roles/platform-roles.module';
import { PlatformOrganizationsModule } from '../platform-organizations/platform-organizations.module';
import { FeatureEngineModule } from '../feature-engine/feature-engine.module';
import { PlatformAuditModule } from '../platform-audit/platform-audit.module';

@Module({
  imports: [AuditLogsModule, PlatformRolesModule, PlatformOrganizationsModule, FeatureEngineModule, PlatformAuditModule],
  providers: [PlatformSupportService, PlatformAdminGuard, PlatformPermissionGuard],
  controllers: [PlatformSupportController],
})
export class PlatformSupportModule {}
