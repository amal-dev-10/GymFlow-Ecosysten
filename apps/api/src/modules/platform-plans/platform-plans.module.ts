import { Module } from '@nestjs/common';
import { PlatformPlansService } from './platform-plans.service';
import { PlatformPlansController, PublicPlansController } from './platform-plans.controller';
import { PlatformAdminGuard } from './guards/platform-admin.guard';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  providers: [PlatformPlansService, PlatformAdminGuard],
  controllers: [PlatformPlansController, PublicPlansController],
})
export class PlatformPlansModule {}
