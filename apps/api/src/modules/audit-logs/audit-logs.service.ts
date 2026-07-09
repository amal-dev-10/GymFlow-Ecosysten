import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { deriveSeverity } from '../platform-audit/severity.util';
import { resolveCountry } from '../platform-audit/geo.util';

@Injectable()
export class AuditLogsService {
  constructor(private prisma: DatabaseService) {}

  // Log an event to the audit_logs table. severity/country/correlationId/
  // requestId are optional (PLT-010) - every existing call site keeps
  // working unchanged. When severity/country are omitted, they're derived
  // automatically so every event gets a sensible value without callers
  // needing to change.
  async logEvent(params: {
    organizationId?: string | null;
    userId?: string | null;
    action: string;
    user: string;
    details: string;
    eventType?: string | null;
    eventCategory?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    metadata?: any;
    ipAddress?: string | null;
    userAgent?: string | null;
    severity?: string | null;
    correlationId?: string | null;
    requestId?: string | null;
    country?: string | null;
  }) {
    return this.prisma.auditLog.create({
      data: {
        organizationId: params.organizationId || null,
        userId: params.userId || null,
        action: params.action,
        user: params.user,
        details: params.details,
        eventType: params.eventType || null,
        eventCategory: params.eventCategory || null,
        entityType: params.entityType || null,
        entityId: params.entityId || null,
        metadata: params.metadata || {},
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        severity: params.severity || deriveSeverity({ eventType: params.eventType, action: params.action }),
        correlationId: params.correlationId || null,
        requestId: params.requestId || null,
        country: params.country || resolveCountry(params.ipAddress) || null,
      },
    });
  }

  // Get audit logs with filters
  async getLogs(orgId: string, query: {
    searchQuery?: string;
    eventCategory?: string;
    eventType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    device?: string;
    page?: number;
    limit?: number;
  }) {
    const where: any = {
      organizationId: orgId,
    };

    if (query.eventCategory && query.eventCategory !== 'all') {
      where.eventCategory = query.eventCategory;
    }

    if (query.eventType && query.eventType !== 'all') {
      where.eventType = query.eventType;
    }

    // Status filter (e.g. Success vs Failed)
    if (query.status && query.status !== 'all') {
      if (query.status === 'success') {
        where.action = { contains: 'Success' };
      } else if (query.status === 'failed') {
        where.action = { contains: 'Failed' };
      }
    }

    // Date range filter
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        // Set to end of the day
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    // Search query: phone number, user name, details, ipAddress
    if (query.searchQuery) {
      where.OR = [
        { user: { contains: query.searchQuery, mode: 'insensitive' } },
        { details: { contains: query.searchQuery, mode: 'insensitive' } },
        { ipAddress: { contains: query.searchQuery, mode: 'insensitive' } },
        { action: { contains: query.searchQuery, mode: 'insensitive' } },
      ];
    }

    // Device filter directly in DB query
    if (query.device && query.device !== 'all') {
      where.metadata = {
        path: ['device'],
        equals: query.device,
      };
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 15;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Any event that should surface in the "Security Warnings" tab - kept as
  // one shared filter so the KPI count, the tab badge, and the list itself
  // can never drift out of sync with each other the way they used to
  // (the KPI/badge counted the whole table while the tab only ever looked
  // at whatever page of the generic logs list happened to be loaded).
  private securityWarningsWhere(orgId: string) {
    return {
      organizationId: orgId,
      OR: [
        { eventCategory: 'Security' },
        { eventType: 'SUSPICIOUS_ACTIVITY' },
        { eventType: 'PERMISSION_DENIED' },
        { eventType: 'UNAUTHORIZED_ACCESS' },
      ],
    };
  }

  async getSecurityWarnings(orgId: string, page = 1, limit = 20) {
    const where = this.securityWarningsWhere(orgId);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  // Get stats for the workspace activity dashboard. Keeps the original
  // authentication counters (still used by the Security tab and CSV export)
  // but adds the business-activity metrics that now headline the page:
  // total events today, members added, and today's check-ins.
  async getStats(orgId: string) {
    const startOfToday = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();

    const [
      successfulLogins,
      failedLogins,
      organizationSwitches,
      permissionDenials,
      suspiciousActivities,
      todayLogins,
      totalEventsToday,
      membersAdded,
      checkInsToday,
    ] = await Promise.all([
      this.prisma.auditLog.count({ where: { organizationId: orgId, eventType: 'LOGIN_SUCCESS' } }),
      this.prisma.auditLog.count({ where: { organizationId: orgId, eventType: 'LOGIN_FAILED' } }),
      this.prisma.auditLog.count({ where: { organizationId: orgId, eventType: 'ORG_SWITCHED' } }),
      this.prisma.auditLog.count({ where: { organizationId: orgId, eventType: { in: ['PERMISSION_DENIED', 'UNAUTHORIZED_ACCESS'] } } }),
      this.prisma.auditLog.count({ where: this.securityWarningsWhere(orgId) }),
      this.prisma.auditLog.count({
        where: { organizationId: orgId, eventType: 'LOGIN_SUCCESS', createdAt: { gte: startOfToday } },
      }),
      // All workspace activity events logged today (any category).
      this.prisma.auditLog.count({
        where: { organizationId: orgId, createdAt: { gte: startOfToday } },
      }),
      // Members added to the workspace (all-time).
      this.prisma.auditLog.count({
        where: { organizationId: orgId, eventType: 'MEMBER_CREATED' },
      }),
      // Member/guest check-ins recorded today.
      this.prisma.auditLog.count({
        where: { organizationId: orgId, eventType: 'ATTENDANCE_CHECK_IN', createdAt: { gte: startOfToday } },
      }),
    ]);

    // Active Sessions (sessions with LOGIN_SUCCESS but no SESSION_REVOKED/LOGOUT)
    const sessions = await this.getSessions(orgId);
    const activeSessionsCount = sessions.filter(s => s.status === 'Active').length;

    return {
      successfulLogins,
      failedLogins,
      activeSessions: activeSessionsCount,
      suspiciousActivities,
      organizationSwitches,
      permissionDenials,
      todayLogins,
      totalEventsToday,
      membersAdded,
      checkInsToday,
    };
  }

  // Retrieve active & revoked sessions based on events
  async getSessions(orgId: string) {
    const loginEvents = await this.prisma.auditLog.findMany({
      where: {
        organizationId: orgId,
        eventType: 'LOGIN_SUCCESS',
      },
      orderBy: { createdAt: 'desc' },
    });

    const endEvents = await this.prisma.auditLog.findMany({
      where: {
        organizationId: orgId,
        eventType: { in: ['SESSION_REVOKED', 'LOGOUT'] },
      },
    });

    const revokedSessionIds = new Set<string>();
    endEvents.forEach(e => {
      const meta = (e.metadata as any) || {};
      if (meta.sessionId) {
        revokedSessionIds.add(meta.sessionId);
      }
    });

    const sessions: any[] = [];
    const seenSessionIds = new Set<string>();

    for (const log of loginEvents) {
      const meta = (log.metadata as any) || {};
      const sessionId = meta.sessionId || log.id; // Fallback to log ID if no sessionId in metadata

      if (seenSessionIds.has(sessionId)) continue;
      seenSessionIds.add(sessionId);

      const isRevoked = revokedSessionIds.has(sessionId);

      sessions.push({
        id: sessionId,
        user: log.user,
        userId: log.userId || '',
        device: meta.device || 'Desktop',
        browser: meta.browser || 'Chrome',
        ipAddress: log.ipAddress || '127.0.0.1',
        createdAt: log.createdAt.toISOString(),
        lastActivity: log.createdAt.toISOString(), // For mock simplicity
        status: isRevoked ? 'Revoked' : 'Active',
      });
    }

    return sessions;
  }

  // Revoke session
  async revokeSession(orgId: string, sessionId: string, actorUser: string) {
    // Find the login event representing this session to verify it exists
    const loginLogs = await this.prisma.auditLog.findMany({
      where: { organizationId: orgId, eventType: 'LOGIN_SUCCESS' },
    });

    const sessionLog = loginLogs.find(l => {
      const meta = (l.metadata as any) || {};
      return (meta.sessionId === sessionId || l.id === sessionId);
    });

    if (!sessionLog) {
      throw new NotFoundException('Session not found');
    }

    const sessionMeta = (sessionLog.metadata as any) || {};

    // Log the revocation event
    await this.logEvent({
      organizationId: orgId,
      userId: sessionLog.userId,
      action: 'Session Revoked',
      user: actorUser,
      details: `Revoked active session for user '${sessionLog.user}' on ${sessionMeta.device || 'Desktop'}.`,
      eventType: 'SESSION_REVOKED',
      eventCategory: 'Session',
      entityType: 'Session',
      entityId: sessionId,
      metadata: {
        sessionId,
        device: sessionMeta.device,
        browser: sessionMeta.browser,
      },
      ipAddress: sessionLog.ipAddress,
      userAgent: sessionLog.userAgent,
    });

    return { success: true };
  }
}
