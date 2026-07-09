import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { QuickSendDto } from './dto/quick-send.dto';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/template.dto';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';

const AUDIENCE_TYPES = ['ALL_ORGANIZATIONS', 'SELECTED_ORGANIZATIONS', 'OWNERS', 'EMPLOYEES', 'MEMBERS', 'PLATFORM_USERS'];

// Documented, honest simulation - no SMTP/Twilio/FCM/APNs/WhatsApp SDK is
// wired anywhere in this codebase. A future integration replaces this one
// function; nothing else in the module needs to change.
const SIMULATED_FAILURE_RATE = 0.08;
const SIMULATED_READ_RATE = 0.55;
const SIMULATED_FAILURE_REASONS = ['Invalid recipient address', 'Provider timeout', 'Recipient unreachable', 'Delivery rejected by provider'];

const MAX_FANOUT = 5000;

interface ResolvedRecipient {
  recipientType: string;
  recipientId: string;
  recipientName: string;
  organizationId: string | null;
}

@Injectable()
export class PlatformNotificationsService {
  constructor(
    private prisma: DatabaseService,
    private auditLogs: AuditLogsService,
  ) {}

  // --- LAZY SCHEDULING (no cron anywhere in this codebase - see
  // PlatformAuthorizationService.expireStaleAssignments() for the same
  // pattern). Called at the top of every read endpoint below so Scheduled/
  // Recurring campaigns actually fire without a background worker. ---
  private async processDueCampaigns() {
    const now = new Date();
    const due = await this.prisma.notification.findMany({
      where: { status: 'Scheduled', scheduledFor: { lte: now } },
      take: MAX_FANOUT,
    });
    if (due.length === 0) return;

    const byCampaign = new Map<string, typeof due>();
    for (const n of due) {
      const outcome = this.simulateOutcome();
      await this.prisma.notification.update({
        where: { id: n.id },
        data: { status: outcome.status, sentAt: now, deliveredAt: outcome.deliveredAt, readAt: outcome.readAt, failureReason: outcome.failureReason },
      });
      if (n.campaignId) {
        if (!byCampaign.has(n.campaignId)) byCampaign.set(n.campaignId, []);
        byCampaign.get(n.campaignId)!.push(n);
      }
    }

    for (const campaignId of byCampaign.keys()) {
      const campaign = await this.prisma.notificationCampaign.findUnique({ where: { id: campaignId } });
      if (!campaign) continue;
      if (campaign.scheduleType === 'RECURRING' && campaign.recurringFrequency) {
        const nextRunAt = this.computeNextRun(campaign.nextRunAt || now, campaign.recurringFrequency);
        const recipients = await this.resolveAudience(campaign.audienceType, campaign.audienceFilter as any);
        await this.prisma.notificationCampaign.update({ where: { id: campaignId }, data: { nextRunAt, sentAt: now } });
        await this.fanOutPending({ ...campaign, nextRunAt }, recipients);
      } else {
        await this.prisma.notificationCampaign.update({ where: { id: campaignId }, data: { status: 'Sent', sentAt: now, nextRunAt: null } });
      }
    }
  }

  private computeNextRun(from: Date, frequency: string): Date {
    const next = new Date(from);
    if (frequency === 'DAILY') next.setDate(next.getDate() + 1);
    else if (frequency === 'WEEKLY') next.setDate(next.getDate() + 7);
    else if (frequency === 'MONTHLY') next.setMonth(next.getMonth() + 1);
    return next;
  }

  private simulateOutcome(): { status: string; deliveredAt: Date | null; readAt: Date | null; failureReason: string | null } {
    const now = new Date();
    if (Math.random() < SIMULATED_FAILURE_RATE) {
      const reason = SIMULATED_FAILURE_REASONS[Math.floor(Math.random() * SIMULATED_FAILURE_REASONS.length)];
      return { status: 'Failed', deliveredAt: null, readAt: null, failureReason: reason };
    }
    const read = Math.random() < SIMULATED_READ_RATE;
    return { status: read ? 'Read' : 'Delivered', deliveredAt: now, readAt: read ? new Date(now.getTime() + Math.random() * 60 * 60 * 1000) : null, failureReason: null };
  }

  // --- AUDIENCE RESOLUTION (real queries against real recipient data) ---
  async resolveAudience(audienceType: string, audienceFilter?: { organizationIds?: string[] } | null): Promise<ResolvedRecipient[]> {
    if (!AUDIENCE_TYPES.includes(audienceType)) throw new BadRequestException(`Unknown audience type "${audienceType}".`);
    const orgIds = audienceFilter?.organizationIds;

    switch (audienceType) {
      case 'ALL_ORGANIZATIONS': {
        const orgs = await this.prisma.organization.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, take: MAX_FANOUT });
        return orgs.map((o) => ({ recipientType: 'ORGANIZATION', recipientId: o.id, recipientName: o.name, organizationId: o.id }));
      }
      case 'SELECTED_ORGANIZATIONS': {
        if (!orgIds?.length) return [];
        const orgs = await this.prisma.organization.findMany({ where: { id: { in: orgIds }, deletedAt: null }, select: { id: true, name: true } });
        return orgs.map((o) => ({ recipientType: 'ORGANIZATION', recipientId: o.id, recipientName: o.name, organizationId: o.id }));
      }
      case 'OWNERS': {
        // No explicit "Owner" flag exists on OrganizationUser/Role in this
        // schema - prefer a role name that looks like Owner/Admin, else fall
        // back to each organization's first active OrganizationUser row.
        // A documented heuristic, same honesty pattern as PLT-012's
        // tax-type-by-country heuristic - not fabricated data.
        const where: any = { isActive: true };
        if (orgIds?.length) where.organizationId = { in: orgIds };
        const all = await this.prisma.organizationUser.findMany({ where, include: { user: true, role: true }, orderBy: { id: 'asc' } });
        const byOrg = new Map<string, (typeof all)[number]>();
        for (const ou of all) if (!byOrg.has(ou.organizationId)) byOrg.set(ou.organizationId, ou);
        for (const ou of all) {
          if (/owner|admin/i.test(ou.role?.name || '')) byOrg.set(ou.organizationId, ou);
        }
        return [...byOrg.values()].map((ou) => ({
          recipientType: 'OWNER',
          recipientId: ou.userId,
          recipientName: ou.user.fullName,
          organizationId: ou.organizationId,
        }));
      }
      case 'EMPLOYEES': {
        const where: any = { deletedAt: null };
        if (orgIds?.length) where.organizationId = { in: orgIds };
        const employees = await this.prisma.employee.findMany({ where, include: { user: true }, take: MAX_FANOUT });
        return employees.map((e) => ({ recipientType: 'EMPLOYEE', recipientId: e.userId, recipientName: e.user.fullName, organizationId: e.organizationId }));
      }
      case 'MEMBERS': {
        const where: any = { deletedAt: null };
        if (orgIds?.length) where.organizationId = { in: orgIds };
        const members = await this.prisma.member.findMany({ where, take: MAX_FANOUT });
        return members.map((m) => ({ recipientType: 'MEMBER', recipientId: m.id, recipientName: `${m.firstName} ${m.lastName}`.trim(), organizationId: m.organizationId }));
      }
      case 'PLATFORM_USERS': {
        const admins = await this.prisma.platformAdminUser.findMany({ where: { isActive: true }, include: { user: true }, take: MAX_FANOUT });
        return admins.map((a) => ({ recipientType: 'PLATFORM_USER', recipientId: a.userId, recipientName: a.user.fullName, organizationId: null }));
      }
      default:
        return [];
    }
  }

  async resolveAudienceCount(audienceType: string, audienceFilter?: { organizationIds?: string[] } | null) {
    const recipients = await this.resolveAudience(audienceType, audienceFilter);
    return { count: recipients.length };
  }

  private async fanOutPending(campaign: { id: string; templateId: string | null; bodyOverride: string | null; notificationType: string; channel: string; priority: string; name: string; nextRunAt: Date | null; scheduledFor: Date | null }, recipients: ResolvedRecipient[]) {
    let title = campaign.name;
    let body = campaign.bodyOverride || '';
    if (campaign.templateId) {
      const template = await this.prisma.notificationTemplate.findUnique({ where: { id: campaign.templateId } });
      if (template) {
        title = template.title;
        body = campaign.bodyOverride || template.body;
      }
    }
    const scheduledFor = campaign.nextRunAt || campaign.scheduledFor || new Date();
    const rows = recipients.slice(0, MAX_FANOUT).map((r) => ({
      campaignId: campaign.id,
      title,
      body,
      notificationType: campaign.notificationType,
      channel: campaign.channel,
      priority: campaign.priority,
      status: 'Scheduled',
      recipientType: r.recipientType,
      recipientId: r.recipientId,
      recipientName: r.recipientName,
      organizationId: r.organizationId,
      scheduledFor,
    }));
    if (rows.length) await this.prisma.notification.createMany({ data: rows });
    return rows.length;
  }

  // --- DASHBOARD ---
  async getDashboard(currentUserId?: string) {
    await this.processDueCampaigns();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [total, sentToday, pending, failed, scheduled, unread] = await Promise.all([
      this.prisma.notification.count(),
      this.prisma.notification.count({ where: { sentAt: { gte: startOfToday } } }),
      this.prisma.notification.count({ where: { status: { in: ['Queued', 'Sending'] } } }),
      this.prisma.notification.count({ where: { status: 'Failed' } }),
      this.prisma.notification.count({ where: { status: 'Scheduled' } }),
      currentUserId
        ? this.prisma.notification.count({ where: { recipientType: 'PLATFORM_USER', recipientId: currentUserId, status: { in: ['Delivered'] } } })
        : Promise.resolve(0),
    ]);
    return { total, sentToday, pending, failed, scheduled, unread };
  }

  // --- NOTIFICATIONS / DELIVERY LOGS (same table, different filters) ---
  async listNotifications(filters: ListNotificationsDto) {
    await this.processDueCampaigns();
    // No global ValidationPipe with `transform: true` exists in this
    // codebase (confirmed absent from main.ts), so @Type(() => Number) on
    // the DTO never actually coerces query strings - explicit Number()
    // here, same defensive pattern already used in platform-revenue.service.ts.
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 25));
    const where: any = {};
    if (filters.search) where.OR = [{ title: { contains: filters.search, mode: 'insensitive' } }, { recipientName: { contains: filters.search, mode: 'insensitive' } }];
    if (filters.status) where.status = filters.status;
    if (filters.channel) where.channel = filters.channel;
    if (filters.notificationType) where.notificationType = filters.notificationType;
    if (filters.priority) where.priority = filters.priority;
    if (filters.organizationId) where.organizationId = filters.organizationId;
    if (filters.campaignId) where.campaignId = filters.campaignId;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.notification.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  async getNotification(id: string) {
    const n = await this.prisma.notification.findUnique({ where: { id } });
    if (!n) throw new NotFoundException('Notification not found.');
    return n;
  }

  async cancelNotification(id: string, userId: string, userName: string) {
    const n = await this.prisma.notification.findUnique({ where: { id } });
    if (!n) throw new NotFoundException('Notification not found.');
    if (n.status !== 'Scheduled') throw new BadRequestException('Only scheduled notifications can be cancelled.');
    const updated = await this.prisma.notification.update({ where: { id }, data: { status: 'Cancelled' } });
    await this.auditLogs.logEvent({
      userId,
      action: 'Cancelled Notification',
      user: userName,
      details: `Cancelled notification "${n.title}" to ${n.recipientName || 'recipient'}.`,
      eventType: 'NOTIFICATION_CANCELLED',
      eventCategory: 'Notifications',
      entityType: 'Notification',
      entityId: id,
    });
    return updated;
  }

  async quickSend(dto: QuickSendDto, userId: string, userName: string) {
    const recipients = await this.resolveAudience(dto.audienceType, dto.audienceFilter);
    if (recipients.length === 0) throw new BadRequestException('No recipients matched this audience.');
    const now = new Date();
    const rows = recipients.slice(0, MAX_FANOUT).map((r) => ({
      campaignId: null,
      title: dto.title,
      body: dto.body,
      notificationType: dto.notificationType,
      channel: dto.channel,
      priority: dto.priority || 'Normal',
      status: 'Scheduled',
      recipientType: r.recipientType,
      recipientId: r.recipientId,
      recipientName: r.recipientName,
      organizationId: r.organizationId,
      scheduledFor: now,
    }));
    await this.prisma.notification.createMany({ data: rows });
    await this.processDueCampaigns();
    await this.auditLogs.logEvent({
      userId,
      action: 'Sent Notification',
      user: userName,
      details: `Sent "${dto.title}" to ${rows.length} recipient(s) via ${dto.channel}.`,
      eventType: 'NOTIFICATION_SENT',
      eventCategory: 'Notifications',
      entityType: 'Notification',
      metadata: { audienceType: dto.audienceType, channel: dto.channel, count: rows.length },
    });
    return { sentCount: rows.length };
  }

  // --- TEMPLATES ---
  async listTemplates(filters: { category?: string; channel?: string; status?: string; search?: string }) {
    const where: any = {};
    if (filters.category) where.category = filters.category;
    if (filters.channel) where.channel = filters.channel;
    if (filters.status) where.status = filters.status;
    if (filters.search) where.title = { contains: filters.search, mode: 'insensitive' };
    return this.prisma.notificationTemplate.findMany({ where, orderBy: { updatedAt: 'desc' } });
  }

  async getTemplate(id: string) {
    const t = await this.prisma.notificationTemplate.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Template not found.');
    return t;
  }

  async createTemplate(dto: CreateTemplateDto, userId: string, userName: string) {
    const variables = dto.variables?.length ? dto.variables : this.extractVariables(dto.body);
    const template = await this.prisma.notificationTemplate.create({
      data: { title: dto.title, category: dto.category, channel: dto.channel, subject: dto.subject, body: dto.body, variables, status: dto.status || 'Draft', createdByName: userName },
    });
    await this.auditLogs.logEvent({ userId, action: 'Created Template', user: userName, details: `Created template "${template.title}".`, eventType: 'TEMPLATE_CREATED', eventCategory: 'Notifications', entityType: 'NotificationTemplate', entityId: template.id });
    return template;
  }

  async updateTemplate(id: string, dto: UpdateTemplateDto, userId: string, userName: string) {
    const existing = await this.getTemplate(id);
    const body = dto.body ?? existing.body;
    const variables = dto.variables?.length ? dto.variables : dto.body ? this.extractVariables(body) : existing.variables;
    const template = await this.prisma.notificationTemplate.update({ where: { id }, data: { ...dto, variables } });
    await this.auditLogs.logEvent({ userId, action: 'Updated Template', user: userName, details: `Updated template "${template.title}".`, eventType: 'TEMPLATE_UPDATED', eventCategory: 'Notifications', entityType: 'NotificationTemplate', entityId: id });
    return template;
  }

  async archiveTemplate(id: string, userId: string, userName: string) {
    const template = await this.prisma.notificationTemplate.update({ where: { id }, data: { status: 'Archived' } });
    await this.auditLogs.logEvent({ userId, action: 'Archived Template', user: userName, details: `Archived template "${template.title}".`, eventType: 'TEMPLATE_ARCHIVED', eventCategory: 'Notifications', entityType: 'NotificationTemplate', entityId: id });
    return template;
  }

  private extractVariables(body: string): string[] {
    const matches = body.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g) || [];
    return [...new Set(matches.map((m) => m.replace(/[{}]/g, '').trim()))];
  }

  async previewTemplate(id: string, sampleValues?: Record<string, string>) {
    const template = await this.getTemplate(id);
    const values = { ...this.sampleVariableDefaults(), ...(sampleValues || {}) };
    const substitute = (text: string | null) => (text || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => values[key] ?? `{{${key}}}`);
    return { subject: substitute(template.subject), body: substitute(template.body) };
  }

  private sampleVariableDefaults(): Record<string, string> {
    return {
      memberName: 'Alex Johnson',
      organizationName: 'Iron Peak Fitness',
      branch: 'Downtown',
      membershipPlan: 'Gold Annual',
      expiryDate: '2026-12-31',
      amount: '$49.99',
      trainer: 'Sam Rivera',
      workoutName: 'Full Body Strength',
    };
  }

  getVariableCatalog() {
    const fixed = [
      { key: 'memberName', label: 'Member Name' },
      { key: 'organizationName', label: 'Organization Name' },
      { key: 'branch', label: 'Branch' },
      { key: 'membershipPlan', label: 'Membership Plan' },
      { key: 'expiryDate', label: 'Expiry Date' },
      { key: 'amount', label: 'Amount' },
      { key: 'trainer', label: 'Trainer' },
      { key: 'workoutName', label: 'Workout Name' },
    ];
    return fixed;
  }

  // --- CAMPAIGNS ---
  async listCampaigns(filters: { status?: string; channel?: string; search?: string }) {
    await this.processDueCampaigns();
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.channel) where.channel = filters.channel;
    if (filters.search) where.name = { contains: filters.search, mode: 'insensitive' };
    return this.prisma.notificationCampaign.findMany({ where, include: { template: true }, orderBy: { createdAt: 'desc' } });
  }

  async getCampaign(id: string) {
    const campaign = await this.prisma.notificationCampaign.findUnique({ where: { id }, include: { template: true } });
    if (!campaign) throw new NotFoundException('Campaign not found.');
    return campaign;
  }

  async createCampaign(dto: CreateCampaignDto, userId: string, userName: string) {
    const now = new Date();
    const scheduledFor = dto.scheduleType === 'NOW' ? now : dto.scheduledFor ? new Date(dto.scheduledFor) : null;
    if (dto.scheduleType !== 'NOW' && !scheduledFor) throw new BadRequestException('scheduledFor is required for Scheduled/Recurring campaigns.');
    if (dto.scheduleType === 'RECURRING' && !dto.recurringFrequency) throw new BadRequestException('recurringFrequency is required for Recurring campaigns.');

    const campaign = await this.prisma.notificationCampaign.create({
      data: {
        name: dto.name,
        notificationType: dto.notificationType,
        channel: dto.channel,
        templateId: dto.templateId || null,
        bodyOverride: dto.bodyOverride || null,
        audienceType: dto.audienceType,
        audienceFilter: (dto.audienceFilter as any) || undefined,
        priority: dto.priority || 'Normal',
        status: 'Scheduled',
        scheduleType: dto.scheduleType,
        scheduledFor,
        recurringFrequency: dto.recurringFrequency || null,
        nextRunAt: scheduledFor,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        timezone: dto.timezone || 'UTC',
        createdByName: userName,
      },
    });

    const recipients = await this.resolveAudience(dto.audienceType, dto.audienceFilter);
    const count = await this.fanOutPending(campaign, recipients);

    await this.auditLogs.logEvent({
      userId,
      action: 'Created Campaign',
      user: userName,
      details: `Created campaign "${campaign.name}" targeting ${count} recipient(s).`,
      eventType: 'CAMPAIGN_CREATED',
      eventCategory: 'Notifications',
      entityType: 'NotificationCampaign',
      entityId: campaign.id,
      metadata: { audienceType: dto.audienceType, count, scheduleType: dto.scheduleType },
    });

    if (dto.scheduleType === 'NOW') await this.processDueCampaigns();
    return this.getCampaign(campaign.id);
  }

  async updateCampaign(id: string, dto: UpdateCampaignDto, userId: string, userName: string) {
    const existing = await this.getCampaign(id);
    if (existing.status === 'Sent' || existing.status === 'Cancelled') throw new BadRequestException(`Cannot edit a campaign that is already ${existing.status}.`);
    const campaign = await this.prisma.notificationCampaign.update({
      where: { id },
      data: {
        name: dto.name,
        priority: dto.priority,
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
        nextRunAt: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
    await this.auditLogs.logEvent({ userId, action: 'Updated Campaign', user: userName, details: `Updated campaign "${campaign.name}".`, eventType: 'CAMPAIGN_UPDATED', eventCategory: 'Notifications', entityType: 'NotificationCampaign', entityId: id });
    return campaign;
  }

  async cancelCampaign(id: string, userId: string, userName: string) {
    const campaign = await this.getCampaign(id);
    if (campaign.status === 'Sent' || campaign.status === 'Cancelled') throw new BadRequestException(`Campaign is already ${campaign.status}.`);
    await this.prisma.notification.updateMany({ where: { campaignId: id, status: 'Scheduled' }, data: { status: 'Cancelled' } });
    const updated = await this.prisma.notificationCampaign.update({ where: { id }, data: { status: 'Cancelled', cancelledAt: new Date() } });
    await this.auditLogs.logEvent({ userId, action: 'Cancelled Campaign', user: userName, details: `Cancelled campaign "${campaign.name}".`, eventType: 'CAMPAIGN_CANCELLED', eventCategory: 'Notifications', entityType: 'NotificationCampaign', entityId: id });
    return updated;
  }

  async sendCampaignNow(id: string, userId: string, userName: string) {
    const campaign = await this.getCampaign(id);
    if (campaign.status !== 'Scheduled') throw new BadRequestException(`Campaign is not in a sendable state (${campaign.status}).`);
    await this.prisma.notification.updateMany({ where: { campaignId: id, status: 'Scheduled' }, data: { scheduledFor: new Date() } });
    await this.processDueCampaigns();
    await this.auditLogs.logEvent({ userId, action: 'Sent Campaign Now', user: userName, details: `Manually triggered send for campaign "${campaign.name}".`, eventType: 'CAMPAIGN_SENT', eventCategory: 'Notifications', entityType: 'NotificationCampaign', entityId: id });
    return this.getCampaign(id);
  }

  async listSchedules() {
    await this.processDueCampaigns();
    return this.prisma.notificationCampaign.findMany({ where: { status: 'Scheduled' }, include: { template: true }, orderBy: { nextRunAt: 'asc' } });
  }

  // --- CHANNEL CATALOG (mirrors PaymentGateway's exact shape from PLT-012 -
  // a future FCM/APNs/SMTP/Twilio/WhatsApp integration is a new row or a
  // provider swap behind an existing key, never a UI change) ---
  async listChannels() {
    return this.prisma.notificationChannel.findMany({ orderBy: { order: 'asc' } });
  }

  async updateChannel(key: string, isActive: boolean, userId: string, userName: string) {
    const channel = await this.prisma.notificationChannel.update({ where: { key }, data: { isActive } });
    await this.auditLogs.logEvent({ userId, action: `${isActive ? 'Enabled' : 'Disabled'} Notification Channel`, user: userName, details: `${channel.label} channel ${isActive ? 'enabled' : 'disabled'}.`, eventType: 'CHANNEL_UPDATED', eventCategory: 'Notifications', entityType: 'NotificationChannel', entityId: key });
    return channel;
  }
}
