import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { effectiveSeverity, SEVERITY_LEVELS } from './severity.util';
import { parseUserAgentFull } from './user-agent.util';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';
import { CreateSavedSearchDto, UpdateSavedSearchDto } from './dto/saved-search.dto';
import { UpdateRetentionSettingDto } from './dto/retention-setting.dto';
import { CreateAlertRuleDto, UpdateAlertRuleDto } from './dto/alert-rule.dto';
import { RecordExportDto } from './dto/record-export.dto';

const AUDIT_CATEGORY = 'Audit Center';
const DAY_MS = 24 * 60 * 60 * 1000;

// Spec's 19-category canonical taxonomy, seeded into AuditEventCategory.
// Legacy free-form eventCategory strings already in the data (e.g.
// "Commercial", "Session", "Configuration" from PLT-002..008) are not
// force-migrated - the category filter shows this catalog UNION whatever
// distinct values actually exist in AuditLog.
export const CANONICAL_CATEGORIES = [
  { key: 'Authentication', icon: 'KeyRound', order: 0 },
  { key: 'Organizations', icon: 'Building2', order: 1 },
  { key: 'Subscriptions', icon: 'Repeat', order: 2 },
  { key: 'Platform Users', icon: 'Users', order: 3 },
  { key: 'Members', icon: 'UserRound', order: 4 },
  { key: 'Attendance', icon: 'CalendarCheck', order: 5 },
  { key: 'Training Studio', icon: 'Dumbbell', order: 6 },
  { key: 'Nutrition', icon: 'Apple', order: 7 },
  { key: 'Billing', icon: 'Receipt', order: 8 },
  { key: 'Payments', icon: 'CreditCard', order: 9 },
  { key: 'Expenses', icon: 'Wallet', order: 10 },
  { key: 'Reports', icon: 'FileBarChart', order: 11 },
  { key: 'Feature Flags', icon: 'Flag', order: 12 },
  { key: 'Support', icon: 'LifeBuoy', order: 13 },
  { key: 'Monitoring', icon: 'Activity', order: 14 },
  { key: 'API', icon: 'Webhook', order: 15 },
  { key: 'Developer', icon: 'Terminal', order: 16 },
  { key: 'Security', icon: 'ShieldAlert', order: 17 },
  { key: 'System', icon: 'Server', order: 18 },
  { key: 'Configuration', icon: 'Settings', order: 19 },
  { key: 'Notifications', icon: 'Bell', order: 20 },
  { key: 'Automation', icon: 'Workflow', order: 21 },
];

const SECURITY_EVENT_TYPES = [
  'LOGIN_FAILED', 'PLATFORM_USER_LOCKED', 'PLATFORM_MFA_RESET', 'PLATFORM_PASSWORD_RESET_REQUESTED',
  'SESSION_REVOKED', 'ALL_SESSIONS_REVOKED', 'PLATFORM_ROLE_CHANGED', 'PLATFORM_ROLE_ASSIGNED',
  'PLATFORM_ROLE_UNASSIGNED', 'PLATFORM_ROLE_PERMISSIONS_CHANGED', 'PLATFORM_USER_SUSPENDED',
  'SUSPICIOUS_ACTIVITY', 'UNAUTHORIZED_ACCESS',
];
const SECURITY_CATEGORIES = ['Security', 'Authentication', 'Session', 'Roles & Permissions'];

function deriveStatus(row: { action: string; eventType?: string | null }): 'Success' | 'Failure' {
  const haystack = `${row.eventType || ''} ${row.action}`.toUpperCase();
  return haystack.includes('FAILED') || haystack.includes('FAILURE') || haystack.includes('DENIED') ? 'Failure' : 'Success';
}

function enrichRow(row: any) {
  const { device, browser, os } = parseUserAgentFull(row.userAgent);
  return {
    ...row,
    severity: effectiveSeverity(row),
    status: deriveStatus(row),
    device,
    browser,
    os,
  };
}

@Injectable()
export class PlatformAuditService {
  constructor(
    private prisma: DatabaseService,
    private auditLogsService: AuditLogsService,
  ) {}

  // ---------------------------------------------------------------------------
  // DASHBOARD
  // ---------------------------------------------------------------------------

  async getDashboard() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const dayAgo = new Date(Date.now() - DAY_MS);

    const [totalToday, last24h, apiEventsToday] = await Promise.all([
      this.prisma.auditLog.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.auditLog.findMany({ where: { createdAt: { gte: dayAgo } }, select: { eventCategory: true, eventType: true, action: true, severity: true } }),
      this.prisma.apiActivityLog.count({ where: { createdAt: { gte: todayStart } } }),
    ]);

    let critical = 0;
    let authentication = 0;
    let organizations = 0;
    let subscriptions = 0;
    let system = 0;
    let security = 0;

    for (const row of last24h) {
      const sev = effectiveSeverity(row);
      if (sev === 'Critical') critical++;
      const cat = row.eventCategory || '';
      if (cat === 'Authentication') authentication++;
      if (cat === 'Organizations' || cat === 'Organization Management') organizations++;
      if (cat === 'Subscriptions' || cat === 'Commercial') subscriptions++;
      if (cat === 'System') system++;
      if (SECURITY_CATEGORIES.includes(cat) || SECURITY_EVENT_TYPES.includes(row.eventType || '')) security++;
    }

    return {
      totalEventsToday: totalToday,
      criticalEvents: critical,
      authenticationEvents: authentication,
      organizationEvents: organizations,
      subscriptionEvents: subscriptions,
      systemEvents: system,
      apiEvents: apiEventsToday,
      securityEvents: security,
    };
  }

  // ---------------------------------------------------------------------------
  // EXPLORER / LIST / DETAILS
  // ---------------------------------------------------------------------------

  private buildWhere(query: ListAuditLogsDto): any {
    const where: any = {};
    if (query.category) where.eventCategory = query.category;
    if (query.severity) where.severity = query.severity;
    if (query.userId) where.userId = query.userId;
    if (query.organizationId) where.organizationId = query.organizationId;
    if (query.eventType) where.eventType = query.eventType;
    if (query.correlationId) where.correlationId = query.correlationId;
    if (query.country) where.country = query.country;

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (query.status === 'success') where.action = { not: { contains: 'Failed' } };
    if (query.status === 'failure') where.action = { contains: 'Failed' };

    if (query.search) {
      where.OR = [
        { user: { contains: query.search, mode: 'insensitive' } },
        { details: { contains: query.search, mode: 'insensitive' } },
        { action: { contains: query.search, mode: 'insensitive' } },
        { ipAddress: { contains: query.search, mode: 'insensitive' } },
        { requestId: { contains: query.search, mode: 'insensitive' } },
        { entityId: { contains: query.search, mode: 'insensitive' } },
        { correlationId: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  async list(query: ListAuditLogsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 25));
    const where = this.buildWhere(query);

    const [total, rows] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: query.sortDir === 'asc' ? 'asc' : 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { organization: { select: { name: true } } },
      }),
    ]);

    let data = rows.map(enrichRow);
    // Browser/OS/device/status are derived, not stored - filter post-query.
    if (query.browser) data = data.filter((r) => r.browser === query.browser);
    if (query.os) data = data.filter((r) => r.os === query.os);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getDetails(id: string) {
    const row = await this.prisma.auditLog.findUnique({ where: { id }, include: { organization: { select: { name: true } } } });
    if (!row) throw new NotFoundException('Audit event not found');
    const enriched = enrichRow(row);
    const related = row.correlationId ? await this.getRelatedEvents(row.correlationId, id) : [];
    return { ...enriched, relatedEvents: related };
  }

  async getRelatedEvents(correlationId: string, excludeId?: string) {
    const rows = await this.prisma.auditLog.findMany({
      where: { correlationId, ...(excludeId ? { id: { not: excludeId } } : {}) },
      orderBy: { createdAt: 'asc' },
      include: { organization: { select: { name: true } } },
    });
    return rows.map(enrichRow);
  }

  // ---------------------------------------------------------------------------
  // CATEGORIES
  // ---------------------------------------------------------------------------

  async listCategories() {
    const [catalog, distinctRows] = await Promise.all([
      this.prisma.auditEventCategory.findMany({ orderBy: { order: 'asc' } }),
      this.prisma.auditLog.findMany({ distinct: ['eventCategory'], select: { eventCategory: true } }),
    ]);
    const catalogKeys = new Set(catalog.map((c) => c.key));
    const legacy = distinctRows.map((r) => r.eventCategory).filter((c): c is string => !!c && !catalogKeys.has(c));
    return [
      ...catalog,
      ...legacy.sort().map((key) => ({ key, label: key, icon: null, order: 999, description: 'Legacy category (pre-Audit Center)', isEnabled: true })),
    ];
  }

  /** Display/filter toggle only - does not suppress writes at the ~15 source call sites. See AuditEventCategory's doc comment. */
  async setCategoryEnabled(key: string, isEnabled: boolean) {
    const existing = await this.prisma.auditEventCategory.findUnique({ where: { key } });
    if (!existing) throw new NotFoundException('Category not found in the catalog (legacy categories cannot be toggled here).');
    return this.prisma.auditEventCategory.update({ where: { key }, data: { isEnabled } });
  }

  // ---------------------------------------------------------------------------
  // SECURITY EVENTS
  // ---------------------------------------------------------------------------

  async getSecurityEvents(query: ListAuditLogsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 25));
    const where = {
      ...this.buildWhere(query),
      OR: [{ eventCategory: { in: SECURITY_CATEGORIES } }, { eventType: { in: SECURITY_EVENT_TYPES } }],
    };

    const [total, rows] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, include: { organization: { select: { name: true } } } }),
    ]);

    const dayAgo = new Date(Date.now() - DAY_MS);
    const [failedLogins, mfaEvents, lockedAccounts, roleChanges] = await Promise.all([
      this.prisma.auditLog.count({ where: { eventType: 'LOGIN_FAILED', createdAt: { gte: dayAgo } } }),
      this.prisma.auditLog.count({ where: { eventType: 'PLATFORM_MFA_RESET', createdAt: { gte: dayAgo } } }),
      this.prisma.auditLog.count({ where: { eventType: 'PLATFORM_USER_LOCKED', createdAt: { gte: dayAgo } } }),
      this.prisma.auditLog.count({ where: { eventType: { in: ['PLATFORM_ROLE_CHANGED', 'PLATFORM_ROLE_ASSIGNED', 'PLATFORM_ROLE_UNASSIGNED'] }, createdAt: { gte: dayAgo } } }),
    ]);

    return {
      data: rows.map(enrichRow),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats: { failedLogins, mfaEvents, lockedAccounts, roleChanges },
    };
  }

  // ---------------------------------------------------------------------------
  // API ACTIVITY
  // ---------------------------------------------------------------------------

  async getApiActivity(query: { page?: number; limit?: number; path?: string; statusCode?: number }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 25));
    const where: any = {};
    if (query.path) where.path = { contains: query.path, mode: 'insensitive' };
    if (query.statusCode) where.statusCode = Number(query.statusCode);

    const [total, rows] = await Promise.all([
      this.prisma.apiActivityLog.count({ where }),
      this.prisma.apiActivityLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    ]);

    const dayAgo = new Date(Date.now() - DAY_MS);
    const recent = await this.prisma.apiActivityLog.findMany({ where: { createdAt: { gte: dayAgo } }, select: { statusCode: true, responseTimeMs: true, path: true } });
    const requestCount = recent.length;
    const failedRequests = recent.filter((r) => r.statusCode >= 400).length;
    const avgResponseTimeMs = requestCount ? Math.round(recent.reduce((sum, r) => sum + r.responseTimeMs, 0) / requestCount) : 0;

    const endpointCounts = new Map<string, number>();
    for (const r of recent) endpointCounts.set(r.path, (endpointCounts.get(r.path) || 0) + 1);
    const topEndpoints = Array.from(endpointCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([path, count]) => ({ path, count }));

    return {
      data: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats: { requestCount, failedRequests, avgResponseTimeMs, topEndpoints },
    };
  }

  // ---------------------------------------------------------------------------
  // SAVED SEARCHES
  // ---------------------------------------------------------------------------

  listSavedSearches() {
    return this.prisma.auditSavedSearch.findMany({ orderBy: [{ isSystem: 'desc' }, { name: 'asc' }] });
  }

  async createSavedSearch(dto: CreateSavedSearchDto, actorUserId: string) {
    const actorName = await this.getActorName(actorUserId);
    return this.prisma.auditSavedSearch.create({ data: { name: dto.name, filters: dto.filters as any, ownerName: actorName } });
  }

  async updateSavedSearch(id: string, dto: UpdateSavedSearchDto) {
    const existing = await this.prisma.auditSavedSearch.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Saved search not found');
    return this.prisma.auditSavedSearch.update({ where: { id }, data: { name: dto.name, filters: dto.filters as any } });
  }

  async removeSavedSearch(id: string) {
    const existing = await this.prisma.auditSavedSearch.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Saved search not found');
    if (existing.isSystem) throw new BadRequestException('System saved searches cannot be deleted.');
    await this.prisma.auditSavedSearch.delete({ where: { id } });
    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  // RETENTION
  // ---------------------------------------------------------------------------

  async getRetentionSetting() {
    const existing = await this.prisma.auditRetentionSetting.findFirst();
    if (existing) return existing;
    return this.prisma.auditRetentionSetting.create({ data: { defaultRetentionDays: 90, archiveEnabled: false } });
  }

  async updateRetentionSetting(dto: UpdateRetentionSettingDto, actorUserId: string) {
    const actorName = await this.getActorName(actorUserId);
    const current = await this.getRetentionSetting();
    return this.prisma.auditRetentionSetting.update({
      where: { id: current.id },
      data: {
        defaultRetentionDays: dto.defaultRetentionDays === undefined ? current.defaultRetentionDays : dto.defaultRetentionDays,
        archiveEnabled: dto.archiveEnabled ?? current.archiveEnabled,
        categoryOverrides: dto.categoryOverrides ?? (current.categoryOverrides as any),
        updatedByName: actorName,
      },
    });
  }

  /** How many events would be affected right now at a given retention window. Preview only - nothing is deleted. */
  async previewRetention(days: number | null) {
    if (days == null) return { affectedCount: 0, cutoff: null };
    const cutoff = new Date(Date.now() - days * DAY_MS);
    const affectedCount = await this.prisma.auditLog.count({ where: { createdAt: { lt: cutoff } } });
    return { affectedCount, cutoff };
  }

  // ---------------------------------------------------------------------------
  // ALERTS
  // ---------------------------------------------------------------------------

  listAlertRules() {
    return this.prisma.auditAlertRule.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createAlertRule(dto: CreateAlertRuleDto, actorUserId: string) {
    const actorName = await this.getActorName(actorUserId);
    return this.prisma.auditAlertRule.create({
      data: { name: dto.name, description: dto.description, triggerType: dto.triggerType, conditions: dto.conditions, isEnabled: dto.isEnabled ?? true, createdByName: actorName },
    });
  }

  async updateAlertRule(id: string, dto: UpdateAlertRuleDto) {
    const existing = await this.prisma.auditAlertRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Alert rule not found');
    return this.prisma.auditAlertRule.update({ where: { id }, data: dto as any });
  }

  async removeAlertRule(id: string) {
    const existing = await this.prisma.auditAlertRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Alert rule not found');
    await this.prisma.auditAlertRule.delete({ where: { id } });
    return { ok: true };
  }

  /** Real computed "would this have fired?" preview against the last 24h of data - no delivery, just a count. */
  async previewAlertRule(id: string) {
    const rule = await this.prisma.auditAlertRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Alert rule not found');
    const conditions = rule.conditions as any as { threshold: number; windowMinutes: number };
    const windowStart = new Date(Date.now() - (conditions.windowMinutes || 1440) * 60 * 1000);

    let matchCount = 0;
    switch (rule.triggerType) {
      case 'CRITICAL_EVENT': {
        const rows = await this.prisma.auditLog.findMany({ where: { createdAt: { gte: windowStart } }, select: { severity: true, eventType: true, action: true } });
        matchCount = rows.filter((r) => effectiveSeverity(r) === 'Critical').length;
        break;
      }
      case 'FAILED_PAYMENT':
        matchCount = await this.prisma.auditLog.count({ where: { createdAt: { gte: windowStart }, action: { contains: 'Payment', mode: 'insensitive' }, eventType: { contains: 'FAILED' } } });
        break;
      case 'REPEATED_LOGIN_FAILURES':
        matchCount = await this.prisma.auditLog.count({ where: { createdAt: { gte: windowStart }, eventType: 'LOGIN_FAILED' } });
        break;
      case 'HIGH_API_ERRORS':
        matchCount = await this.prisma.apiActivityLog.count({ where: { createdAt: { gte: windowStart }, statusCode: { gte: 500 } } });
        break;
      case 'PERMISSION_CHANGES':
        matchCount = await this.prisma.auditLog.count({ where: { createdAt: { gte: windowStart }, eventType: { in: ['PLATFORM_ROLE_PERMISSIONS_CHANGED', 'PLATFORM_ROLE_CHANGED'] } } });
        break;
      case 'SECURITY_RISK':
        matchCount = await this.prisma.auditLog.count({ where: { createdAt: { gte: windowStart }, OR: [{ eventCategory: { in: SECURITY_CATEGORIES } }, { eventType: { in: SECURITY_EVENT_TYPES } }] } });
        break;
    }

    return { matchCount, threshold: conditions.threshold, wouldTrigger: matchCount >= conditions.threshold, windowMinutes: conditions.windowMinutes };
  }

  // ---------------------------------------------------------------------------
  // EXPORT
  // ---------------------------------------------------------------------------

  async recordExport(dto: RecordExportDto, actorUserId: string) {
    const actorName = await this.getActorName(actorUserId);
    const job = await this.prisma.auditExportJob.create({
      data: { format: dto.format, filters: (dto.filters || {}) as any, requestedByName: actorName, rowCount: dto.rowCount },
    });
    await this.auditLogsService.logEvent({
      userId: actorUserId,
      action: 'Audit Log Exported',
      user: actorName,
      details: `Exported ${dto.rowCount} audit event(s) as ${dto.format}.`,
      eventType: 'AUDIT_LOG_EXPORTED',
      eventCategory: AUDIT_CATEGORY,
      entityType: 'AuditExportJob',
      entityId: job.id,
    });
    return job;
  }

  listExportJobs() {
    return this.prisma.auditExportJob.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private async getActorName(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user?.fullName || 'Platform Admin';
  }
}
