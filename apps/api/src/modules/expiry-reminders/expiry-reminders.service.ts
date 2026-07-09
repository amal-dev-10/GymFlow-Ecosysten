import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { DispatchReminderDto } from './dto/dispatch-reminder.dto';

const SIMULATED_FAILURE_RATE = 0.08;
const VALID_CHANNELS = ['SMS', 'WhatsApp', 'Email'];

@Injectable()
export class ExpiryRemindersService {
  constructor(
    private prisma: DatabaseService,
    private auditLogs: AuditLogsService,
  ) {}

  // --- RULES ---

  async listRules(organizationId: string) {
    return this.prisma.expiryReminderRule.findMany({
      where: { organizationId },
      orderBy: { triggerDays: 'desc' },
    });
  }

  async createRule(organizationId: string, dto: CreateRuleDto, actorUserId?: string) {
    const invalidCh = dto.channels.filter(c => !VALID_CHANNELS.includes(c));
    if (invalidCh.length) throw new BadRequestException(`Invalid channels: ${invalidCh.join(', ')}`);

    const rule = await this.prisma.expiryReminderRule.create({
      data: { organizationId, ...dto },
    });

    await this.auditLogs.logEvent({
      organizationId,
      userId: actorUserId,
      action: 'Expiry Reminder Rule Created',
      user: await this.actorName(actorUserId),
      details: `Created reminder rule "${rule.label}" (trigger: ${rule.triggerDays}d, channels: ${rule.channels.join(', ')}).`,
      eventType: 'EXPIRY_REMINDER_RULE_CREATED',
      eventCategory: 'Membership',
      entityType: 'ExpiryReminderRule',
      entityId: rule.id,
    });

    return rule;
  }

  async updateRule(organizationId: string, ruleId: string, dto: UpdateRuleDto, actorUserId?: string) {
    const rule = await this.prisma.expiryReminderRule.findFirst({ where: { id: ruleId, organizationId } });
    if (!rule) throw new NotFoundException('Rule not found');

    if (dto.channels) {
      const invalidCh = dto.channels.filter(c => !VALID_CHANNELS.includes(c));
      if (invalidCh.length) throw new BadRequestException(`Invalid channels: ${invalidCh.join(', ')}`);
    }

    const updated = await this.prisma.expiryReminderRule.update({
      where: { id: ruleId },
      data: { ...dto },
    });

    await this.auditLogs.logEvent({
      organizationId,
      userId: actorUserId,
      action: 'Expiry Reminder Rule Updated',
      user: await this.actorName(actorUserId),
      details: `Updated reminder rule "${updated.label}".`,
      eventType: 'EXPIRY_REMINDER_RULE_UPDATED',
      eventCategory: 'Membership',
      entityType: 'ExpiryReminderRule',
      entityId: ruleId,
    });

    return updated;
  }

  async deleteRule(organizationId: string, ruleId: string, actorUserId?: string) {
    const rule = await this.prisma.expiryReminderRule.findFirst({ where: { id: ruleId, organizationId } });
    if (!rule) throw new NotFoundException('Rule not found');

    await this.prisma.expiryReminderRule.delete({ where: { id: ruleId } });

    await this.auditLogs.logEvent({
      organizationId,
      userId: actorUserId,
      action: 'Expiry Reminder Rule Deleted',
      user: await this.actorName(actorUserId),
      details: `Deleted reminder rule "${rule.label}".`,
      eventType: 'EXPIRY_REMINDER_RULE_DELETED',
      eventCategory: 'Membership',
      entityType: 'ExpiryReminderRule',
      entityId: ruleId,
    });

    return { deleted: true };
  }

  // --- DISPATCH ---

  async dispatch(organizationId: string, dto: DispatchReminderDto, actorUserId?: string) {
    const rule = await this.prisma.expiryReminderRule.findFirst({ where: { id: dto.ruleId, organizationId } });
    if (!rule) throw new NotFoundException('Rule not found');
    if (!rule.isActive) throw new BadRequestException('Rule is inactive');

    // Respect platform channel config for this org
    const channelConfig = await this.prisma.orgReminderChannelConfig.findUnique({ where: { organizationId } });
    const allowedChannels = rule.channels.filter(ch => {
      if (!channelConfig) return true;
      if (ch === 'SMS') return channelConfig.smsEnabled;
      if (ch === 'WhatsApp') return channelConfig.whatsAppEnabled;
      if (ch === 'Email') return channelConfig.emailEnabled;
      return true;
    });

    if (allowedChannels.length === 0) {
      throw new BadRequestException('All channels for this rule are disabled by the platform admin');
    }

    // Resolve target subscriptions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + rule.triggerDays);

    let subscriptions: any[];
    if (dto.subscriptionIds && dto.subscriptionIds.length > 0) {
      subscriptions = await this.prisma.memberMembership.findMany({
        where: { id: { in: dto.subscriptionIds }, member: { organizationId } },
        include: { member: true },
      });
    } else {
      // Auto-target: find subscriptions expiring on triggerDays from now
      const windowStart = new Date(targetDate);
      const windowEnd = new Date(targetDate);
      windowEnd.setHours(23, 59, 59, 999);
      subscriptions = await this.prisma.memberMembership.findMany({
        where: {
          member: { organizationId },
          endDate: { gte: windowStart, lte: windowEnd },
          status: 'Active',
        },
        include: { member: true },
        take: 500,
      });
    }

    // Fan out and log
    const logs: any[] = [];
    for (const sub of subscriptions) {
      for (const channel of allowedChannels) {
        const failed = Math.random() < SIMULATED_FAILURE_RATE;
        logs.push({
          organizationId,
          ruleId: rule.id,
          subscriptionId: sub.id,
          memberId: sub.member?.id || sub.memberId,
          memberName: sub.member ? `${sub.member.firstName} ${sub.member.lastName}`.trim() : 'Unknown',
          channel,
          triggerDays: rule.triggerDays,
          status: failed ? 'Failed' : 'Sent',
          failureReason: failed ? 'Simulated delivery failure' : null,
        });
      }
    }

    if (logs.length > 0) {
      await this.prisma.expiryReminderLog.createMany({ data: logs });
    }

    const sent = logs.filter(l => l.status === 'Sent').length;
    const failed = logs.filter(l => l.status === 'Failed').length;

    await this.auditLogs.logEvent({
      organizationId,
      userId: actorUserId,
      action: 'Expiry Reminders Dispatched',
      user: await this.actorName(actorUserId),
      details: `Dispatched "${rule.label}" to ${subscriptions.length} members via ${allowedChannels.join('/')}. Sent: ${sent}, Failed: ${failed}.`,
      eventType: 'EXPIRY_REMINDERS_DISPATCHED',
      eventCategory: 'Membership',
      entityType: 'ExpiryReminderRule',
      entityId: rule.id,
    });

    return { dispatched: subscriptions.length, channels: allowedChannels, sent, failed };
  }

  // --- LOGS ---

  async listLogs(organizationId: string, limit = 50) {
    return this.prisma.expiryReminderLog.findMany({
      where: { organizationId },
      orderBy: { sentAt: 'desc' },
      take: limit,
      include: { rule: { select: { label: true } } },
    });
  }

  // --- CHANNEL CONFIG (read-only for workspace, managed by platform admin) ---

  async getChannelConfig(organizationId: string) {
    const config = await this.prisma.orgReminderChannelConfig.findUnique({ where: { organizationId } });
    // Return defaults if not configured yet
    return config ?? {
      organizationId,
      smsEnabled: true,
      whatsAppEnabled: true,
      emailEnabled: true,
      smsSenderId: null,
      whatsAppSenderId: null,
      emailFromName: null,
      emailFromAddress: null,
      monthlyLimit: null,
      updatedAt: null,
      updatedByName: null,
    };
  }

  private async actorName(userId?: string): Promise<string> {
    if (!userId) return 'System';
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user?.fullName || user?.phoneNumber || 'Staff Member';
  }
}
