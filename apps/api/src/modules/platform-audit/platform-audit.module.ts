import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PlatformAuditService } from './platform-audit.service';
import { PlatformAuditController } from './platform-audit.controller';
import { ApiActivityInterceptor } from './interceptors/api-activity.interceptor';
import { PlatformAdminGuard } from '../platform-plans/guards/platform-admin.guard';
import { PlatformPermissionGuard } from '../platform-roles/guards/platform-permission.guard';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PlatformRolesModule } from '../platform-roles/platform-roles.module';

@Module({
  imports: [AuditLogsModule, PlatformRolesModule],
  providers: [
    PlatformAuditService,
    PlatformAdminGuard,
    PlatformPermissionGuard,
    // Registered as APP_INTERCEPTOR so it wraps every request app-wide
    // (tenant + platform), not just this module's own routes - see the
    // interceptor's own doc comment for why this is a safe, observe-only
    // global hook.
    { provide: APP_INTERCEPTOR, useClass: ApiActivityInterceptor },
  ],
  controllers: [PlatformAuditController],
  exports: [PlatformAuditService],
})
export class PlatformAuditModule {}
