import { Module } from '@nestjs/common';
import { PlatformOrganizationsService } from './platform-organizations.service';
import { PlatformOrganizationsController } from './platform-organizations.controller';
import { PlatformOrgDetailService } from './platform-org-detail.service';
import { PlatformOrgDetailController } from './platform-org-detail.controller';
import { PlatformAdminGuard } from '../platform-plans/guards/platform-admin.guard';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PlatformCouponsModule } from '../platform-coupons/platform-coupons.module';

@Module({
  imports: [AuditLogsModule, PlatformCouponsModule],
  providers: [PlatformOrganizationsService, PlatformOrgDetailService, PlatformAdminGuard],
  controllers: [PlatformOrganizationsController, PlatformOrgDetailController],
  exports: [PlatformOrganizationsService, PlatformOrgDetailService],
})
export class PlatformOrganizationsModule {}
