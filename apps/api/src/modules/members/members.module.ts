import { Module } from '@nestjs/common';
import { MembersService } from './members.service';
import { MembersController, PublicMembersController } from './members.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  providers: [MembersService],
  controllers: [MembersController, PublicMembersController]
})
export class MembersModule {}
