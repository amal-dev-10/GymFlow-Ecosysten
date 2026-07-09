import { Module } from '@nestjs/common';
import { FeatureEngineService } from './feature-engine.service';
import { FeatureEngineController } from './feature-engine.controller';
import { PlatformAdminGuard } from '../platform-plans/guards/platform-admin.guard';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  providers: [FeatureEngineService, PlatformAdminGuard],
  controllers: [FeatureEngineController],
  exports: [FeatureEngineService],
})
export class FeatureEngineModule {}
