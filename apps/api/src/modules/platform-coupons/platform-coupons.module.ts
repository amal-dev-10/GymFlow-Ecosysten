import { Module } from '@nestjs/common';
import { PlatformCouponsService } from './platform-coupons.service';
import { PlatformCouponsController } from './platform-coupons.controller';
import { PlatformAdminGuard } from '../platform-plans/guards/platform-admin.guard';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  providers: [PlatformCouponsService, PlatformAdminGuard],
  controllers: [PlatformCouponsController],
  exports: [PlatformCouponsService],
})
export class PlatformCouponsModule {}
