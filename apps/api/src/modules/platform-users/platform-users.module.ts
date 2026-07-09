import { Module } from '@nestjs/common';
import { PlatformUsersService } from './platform-users.service';
import { PlatformUsersController } from './platform-users.controller';
import { PlatformAdminGuard } from '../platform-plans/guards/platform-admin.guard';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  providers: [PlatformUsersService, PlatformAdminGuard],
  controllers: [PlatformUsersController],
  exports: [PlatformUsersService],
})
export class PlatformUsersModule {}
