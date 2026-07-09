import { Module } from '@nestjs/common';
import { ExpiryRemindersService } from './expiry-reminders.service';
import { ExpiryRemindersController } from './expiry-reminders.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  controllers: [ExpiryRemindersController],
  providers: [ExpiryRemindersService],
  exports: [ExpiryRemindersService],
})
export class ExpiryRemindersModule {}
