import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './core/database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { MembersModule } from './modules/members/members.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { LeadsModule } from './modules/leads/leads.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { PlatformPlansModule } from './modules/platform-plans/platform-plans.module';
import { FeatureEngineModule } from './modules/feature-engine/feature-engine.module';
import { PlatformOrganizationsModule } from './modules/platform-organizations/platform-organizations.module';
import { PlatformCouponsModule } from './modules/platform-coupons/platform-coupons.module';
import { PlatformUsersModule } from './modules/platform-users/platform-users.module';
import { PlatformRolesModule } from './modules/platform-roles/platform-roles.module';
import { PlatformAuditModule } from './modules/platform-audit/platform-audit.module';
import { PlatformSupportModule } from './modules/platform-support/platform-support.module';
import { PlatformRevenueModule } from './modules/platform-revenue/platform-revenue.module';
import { PlatformGlobalSettingsModule } from './modules/platform-global-settings/platform-global-settings.module';
import { PlatformNotificationsModule } from './modules/platform-notifications/platform-notifications.module';
import { PlatformAutomationModule } from './modules/platform-automation/platform-automation.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { GymsModule } from './modules/gyms/gyms.module';
import { RolesModule } from './modules/roles/roles.module';
import { OrgUsersModule } from './modules/org-users/org-users.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { ExpiryRemindersModule } from './modules/expiry-reminders/expiry-reminders.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { ExercisesModule } from './modules/exercises/exercises.module';
import { MetadataModule } from './modules/metadata/metadata.module';
import { WorkoutsModule } from './modules/workouts/workouts.module';
import { DevicesModule } from './modules/devices/devices.module';
import { RealtimeModule } from './modules/realtime/realtime.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    InvitationsModule,
    EmployeesModule,
    MembersModule,
    DocumentsModule,
    LeadsModule,
    SubscriptionsModule,
    PlatformPlansModule,
    FeatureEngineModule,
    PlatformOrganizationsModule,
    PlatformCouponsModule,
    PlatformUsersModule,
    PlatformRolesModule,
    PlatformAuditModule,
    PlatformSupportModule,
    PlatformRevenueModule,
    PlatformGlobalSettingsModule,
    PlatformNotificationsModule,
    PlatformAutomationModule,
    OrganizationsModule,
    GymsModule,
    RolesModule,
    OrgUsersModule,
    AuditLogsModule,
    MembershipsModule,
    ExpiryRemindersModule,
    AttendanceModule,
    ExercisesModule,
    MetadataModule,
    WorkoutsModule,
    RealtimeModule,
    DevicesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

