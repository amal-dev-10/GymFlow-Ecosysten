import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { RealtimeModule } from '../realtime/realtime.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [RealtimeModule, AuditLogsModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
