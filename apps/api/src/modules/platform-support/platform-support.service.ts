import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupportTicketStatus } from '@gym/database';
import { DatabaseService } from '../../core/database/database.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PlatformOrganizationsService } from '../platform-organizations/platform-organizations.service';
import { FeatureEngineService } from '../feature-engine/feature-engine.service';
import { PlatformAuditService } from '../platform-audit/platform-audit.service';
import { computeSlaStatus, SlaPolicyLike } from './sla.util';
import { ListTicketsDto } from './dto/list-tickets.dto';
import { CreateTicketDto, UpdateTicketDto, AssignEngineerDto } from './dto/create-ticket.dto';
import { PostMessageDto } from './dto/post-message.dto';
import { BulkTicketActionDto } from './dto/bulk-action.dto';
import { CreateEscalationDto, ResolveEscalationDto } from './dto/escalation.dto';
import { UpdateSlaPolicyDto } from './dto/sla-policy.dto';
import { CreateKbArticleDto, UpdateKbArticleDto } from './dto/kb-article.dto';
import { RecordCsatDto } from './dto/csat.dto';

const AUDIT_CATEGORY = 'Support';
const DAY_MS = 24 * 60 * 60 * 1000;
const OPEN_STATUSES: SupportTicketStatus[] = ['NEW', 'OPEN', 'IN_PROGRESS', 'ESCALATED', 'WAITING_FOR_CUSTOMER'];
const CLOSED_STATUSES: SupportTicketStatus[] = ['RESOLVED', 'CLOSED', 'CANCELLED'];

// Priority enum keeps URGENT for backward compatibility (renaming a value
// already in the database isn't safe) - the UI labels it "Critical"
// everywhere, matching the spec exactly.
export const PRIORITY_LABELS: Record<string, string> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Critical' };

const DEFAULT_SLA_POLICY: Record<string, SlaPolicyLike> = {
  LOW: { firstResponseMinutes: 24 * 60, resolutionMinutes: 5 * 24 * 60 },
  MEDIUM: { firstResponseMinutes: 8 * 60, resolutionMinutes: 3 * 24 * 60 },
  HIGH: { firstResponseMinutes: 2 * 60, resolutionMinutes: 24 * 60 },
  URGENT: { firstResponseMinutes: 30, resolutionMinutes: 4 * 60 },
};

@Injectable()
export class PlatformSupportService {
  constructor(
    private prisma: DatabaseService,
    private auditLogsService: AuditLogsService,
    private orgsService: PlatformOrganizationsService,
    private featureEngine: FeatureEngineService,
    private platformAudit: PlatformAuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // DASHBOARD
  // ---------------------------------------------------------------------------

  async getDashboard() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [open, critical, pending, waiting, resolvedToday, responded, resolved, rated] = await Promise.all([
      this.prisma.supportTicket.count({ where: { status: { in: OPEN_STATUSES } } }),
      this.prisma.supportTicket.count({ where: { priority: 'URGENT', status: { notIn: CLOSED_STATUSES } } }),
      this.prisma.supportTicket.count({ where: { status: 'NEW' } }),
      this.prisma.supportTicket.count({ where: { status: 'WAITING_FOR_CUSTOMER' } }),
      this.prisma.supportTicket.count({ where: { status: 'RESOLVED', resolvedAt: { gte: todayStart } } }),
      this.prisma.supportTicket.findMany({ where: { firstRespondedAt: { not: null } }, select: { createdAt: true, firstRespondedAt: true } }),
      this.prisma.supportTicket.findMany({ where: { resolvedAt: { not: null } }, select: { createdAt: true, resolvedAt: true } }),
      this.prisma.supportTicket.findMany({ where: { satisfactionScore: { not: null } }, select: { satisfactionScore: true } }),
    ]);

    const avgMinutes = (rows: any[], endField: string) =>
      rows.length ? Math.round(rows.reduce((s, r) => s + (r[endField].getTime() - r.createdAt.getTime()) / 60000, 0) / rows.length) : null;

    return {
      openTickets: open,
      criticalTickets: critical,
      pendingTickets: pending,
      waitingOnCustomer: waiting,
      resolvedToday,
      avgResponseMinutes: avgMinutes(responded, 'firstRespondedAt'),
      avgResolutionMinutes: avgMinutes(resolved, 'resolvedAt'),
      avgCsat: rated.length ? Math.round((rated.reduce((s, t) => s + (t.satisfactionScore || 0), 0) / rated.length) * 10) / 10 : null,
      csatCount: rated.length,
    };
  }

  // ---------------------------------------------------------------------------
  // TICKET LIST / CRUD
  // ---------------------------------------------------------------------------

  async list(query: ListTicketsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.category) where.category = query.category;
    if (query.assignedEngineerId) where.assignedEngineerId = query.assignedEngineerId;
    if (query.organizationId) where.organizationId = query.organizationId;
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }
    if (query.search) {
      const matchingOrgs = await this.prisma.organization.findMany({ where: { name: { contains: query.search, mode: 'insensitive' } }, select: { id: true } });
      const numeric = Number(query.search.replace(/[^0-9]/g, ''));
      where.OR = [
        { subject: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { organizationId: { in: matchingOrgs.map((o) => o.id) } },
        ...(numeric ? [{ ticketNumber: numeric }] : []),
      ];
    }

    const rows = await this.prisma.supportTicket.findMany({
      where,
      include: { organization: { select: { name: true } }, assignedEngineerUser: { include: { user: true } } },
      orderBy: { [query.sortBy === 'updatedAt' ? 'updatedAt' : 'createdAt']: query.sortDir === 'asc' ? 'asc' : 'desc' },
    });

    const policyMap = await this.getSlaPolicyMap();
    let enriched = rows.map((t) => this.enrichTicket(t, policyMap));

    if (query.sla) enriched = enriched.filter((t) => t.sla.band === query.sla);

    const total = enriched.length;
    const pageItems = enriched.slice((page - 1) * limit, page * limit);
    return { data: pageItems, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async create(dto: CreateTicketDto, actorUserId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: dto.organizationId } });
    if (!org) throw new NotFoundException('Organization not found');

    const actorName = await this.getActorName(actorUserId);
    let assignedEngineer: string | undefined;
    if (dto.assignedEngineerId) {
      const engineer = await this.prisma.platformAdminUser.findUnique({ where: { id: dto.assignedEngineerId }, include: { user: true } });
      assignedEngineer = engineer?.user.fullName;
    }

    const ticket = await this.prisma.supportTicket.create({
      data: {
        organizationId: dto.organizationId,
        subject: dto.subject,
        description: dto.description,
        priority: (dto.priority as any) || 'MEDIUM',
        category: dto.category,
        assignedEngineerId: dto.assignedEngineerId,
        assignedEngineer,
        createdByName: actorName,
        status: 'NEW',
      },
    });

    await this.logEvent(actorUserId, 'Support Ticket Created', `Opened ticket #${ticket.ticketNumber} "${dto.subject}" for "${org.name}".`, ticket.id, org.id, 'SUPPORT_TICKET_CREATED');
    return this.getTicketWorkspace(ticket.id);
  }

  async update(id: string, dto: UpdateTicketDto, actorUserId: string) {
    const ticket = await this.assertTicket(id);
    const changes: string[] = [];
    const data: any = {};
    if (dto.subject !== undefined && dto.subject !== ticket.subject) { data.subject = dto.subject; changes.push('subject'); }
    if (dto.description !== undefined) { data.description = dto.description; changes.push('description'); }
    if (dto.category !== undefined && dto.category !== ticket.category) { data.category = dto.category; changes.push('category'); }
    if (dto.priority !== undefined && dto.priority !== ticket.priority) { data.priority = dto.priority; changes.push('priority'); }
    if (dto.status !== undefined && dto.status !== ticket.status) {
      data.status = dto.status;
      changes.push('status');
      if (dto.status === 'RESOLVED' && !ticket.resolvedAt) data.resolvedAt = new Date();
      if (dto.status !== 'RESOLVED' && dto.status !== 'CLOSED') data.resolvedAt = null;
    }
    if (Object.keys(data).length) await this.prisma.supportTicket.update({ where: { id }, data });
    if (changes.length) {
      await this.logEvent(actorUserId, 'Support Ticket Updated', `Updated ticket #${ticket.ticketNumber}: ${changes.join(', ')}.`, id, ticket.organizationId, 'SUPPORT_TICKET_UPDATED');
    }
    return this.getTicketWorkspace(id);
  }

  async assignEngineer(id: string, dto: AssignEngineerDto, actorUserId: string) {
    const ticket = await this.assertTicket(id);
    const engineer = await this.prisma.platformAdminUser.findUnique({ where: { id: dto.assignedEngineerId }, include: { user: true } });
    if (!engineer) throw new NotFoundException('Platform user not found');

    await this.prisma.supportTicket.update({
      where: { id },
      data: { assignedEngineerId: dto.assignedEngineerId, assignedEngineer: engineer.user.fullName, status: ticket.status === 'NEW' ? 'OPEN' : ticket.status },
    });
    await this.logEvent(actorUserId, 'Engineer Assigned', `Assigned ${engineer.user.fullName} to ticket #${ticket.ticketNumber}.`, id, ticket.organizationId, 'SUPPORT_ENGINEER_ASSIGNED');
    return this.getTicketWorkspace(id);
  }

  async remove(id: string, actorUserId: string) {
    const ticket = await this.assertTicket(id);
    await this.prisma.supportTicket.delete({ where: { id } });
    await this.logEvent(actorUserId, 'Support Ticket Deleted', `Deleted ticket #${ticket.ticketNumber} "${ticket.subject}".`, id, ticket.organizationId, 'SUPPORT_TICKET_DELETED');
    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  // TICKET WORKSPACE (single call for the 3-column detail page)
  // ---------------------------------------------------------------------------

  async getTicketWorkspace(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        organization: true,
        assignedEngineerUser: { include: { user: true } },
        messages: { orderBy: { createdAt: 'asc' }, include: { attachments: true } },
        attachments: true,
        escalations: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const policyMap = await this.getSlaPolicyMap();
    const enriched = this.enrichTicket(ticket, policyMap);

    const [relatedTickets, auditTimeline] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where: { organizationId: ticket.organizationId, id: { not: id } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, ticketNumber: true, subject: true, status: true, priority: true, createdAt: true },
      }),
      this.platformAudit.list({ organizationId: ticket.organizationId, limit: 8, sortDir: 'desc' } as any).catch(() => ({ data: [] })),
    ]);

    let orgSnapshot: any = null;
    let subscriptionSnapshot: any = null;
    try {
      const enrichedOrg = await this.orgsService.getEnriched(ticket.organizationId);
      orgSnapshot = enrichedOrg;
      subscriptionSnapshot = {
        plan: enrichedOrg.plan,
        subscriptionStatus: enrichedOrg.subscriptionStatus,
        trialEndDate: enrichedOrg.trialEndDate,
        subscriptionEndDate: enrichedOrg.subscriptionEndDate,
        paymentStatus: enrichedOrg.paymentStatus,
        isEnterprise: enrichedOrg.isEnterprise,
      };
    } catch {
      // org may be soft-deleted or otherwise unavailable - the ticket workspace still loads.
    }

    let billingSnapshot: any = null;
    try {
      const activeSub = await this.prisma.organizationSubscription.findFirst({ where: { organizationId: ticket.organizationId }, orderBy: { startDate: 'desc' } });
      if (activeSub) {
        const invoices = await this.prisma.subscriptionInvoice.findMany({ where: { subscriptionId: activeSub.id }, orderBy: { createdAt: 'desc' }, take: 5, include: { payments: true } });
        billingSnapshot = { invoices };
      }
    } catch {
      billingSnapshot = null;
    }

    let featureSnapshot: any = null;
    try {
      const detail = await this.featureEngine.getOrganizationDetail(ticket.organizationId);
      featureSnapshot = { featureAccess: detail.featureAccess.slice(0, 12), usage: detail.usage.slice(0, 6), violations: detail.violations };
    } catch {
      featureSnapshot = null;
    }

    return {
      ...enriched,
      relatedTickets,
      auditTimeline: (auditTimeline as any).data || [],
      orgSnapshot,
      subscriptionSnapshot,
      billingSnapshot,
      featureSnapshot,
    };
  }

  // ---------------------------------------------------------------------------
  // MESSAGES
  // ---------------------------------------------------------------------------

  async postMessage(ticketId: string, dto: PostMessageDto, actorUserId: string) {
    const ticket = await this.assertTicket(ticketId);
    const actorName = await this.getActorName(actorUserId);

    const message = await this.prisma.supportTicketMessage.create({
      data: {
        ticketId,
        authorType: 'Agent',
        authorName: actorName,
        authorUserId: actorUserId,
        body: dto.body,
        isInternal: !!dto.isInternal,
        mentions: dto.mentions || [],
      },
    });

    const updateData: any = { updatedAt: new Date() };
    if (!dto.isInternal && !ticket.firstRespondedAt) updateData.firstRespondedAt = new Date();
    if (!dto.isInternal && ticket.status === 'NEW') updateData.status = 'OPEN';
    await this.prisma.supportTicket.update({ where: { id: ticketId }, data: updateData });

    await this.logEvent(
      actorUserId,
      dto.isInternal ? 'Internal Note Added' : 'Engineer Responded',
      `${dto.isInternal ? 'Added an internal note to' : 'Replied to'} ticket #${ticket.ticketNumber}.`,
      ticketId,
      ticket.organizationId,
      dto.isInternal ? 'SUPPORT_INTERNAL_NOTE_ADDED' : 'SUPPORT_AGENT_RESPONDED',
    );

    return message;
  }

  async attachFile(ticketId: string, file: { originalname: string; filename: string; mimetype: string; size: number }, actorUserId: string, messageId?: string) {
    await this.assertTicket(ticketId);
    const actorName = await this.getActorName(actorUserId);
    return this.prisma.supportTicketAttachment.create({
      data: {
        ticketId,
        messageId,
        fileName: file.originalname,
        storagePath: file.filename,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploadedByName: actorName,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // BULK ACTIONS
  // ---------------------------------------------------------------------------

  async bulkAction(dto: BulkTicketActionDto, actorUserId: string) {
    const actorName = await this.getActorName(actorUserId);
    let affected = 0;

    for (const id of dto.ticketIds) {
      const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
      if (!ticket) continue;

      switch (dto.action) {
        case 'assign':
          if (!dto.assignedEngineerId) throw new BadRequestException('assignedEngineerId is required for bulk assign.');
          await this.assignEngineer(id, { assignedEngineerId: dto.assignedEngineerId }, actorUserId);
          break;
        case 'close':
          await this.prisma.supportTicket.update({ where: { id }, data: { status: 'CLOSED', resolvedAt: ticket.resolvedAt || new Date() } });
          await this.logEvent(actorUserId, 'Support Ticket Closed', `Bulk-closed ticket #${ticket.ticketNumber}.`, id, ticket.organizationId, 'SUPPORT_TICKET_CLOSED');
          break;
        case 'escalate':
          await this.createEscalation(id, { toLevel: dto.escalateToLevel || 'Engineering', reason: dto.reason || 'Bulk escalation' }, actorUserId);
          break;
        case 'delete':
          await this.prisma.supportTicket.delete({ where: { id } });
          await this.logEvent(actorUserId, 'Support Ticket Deleted', `Bulk-deleted ticket #${ticket.ticketNumber}.`, id, ticket.organizationId, 'SUPPORT_TICKET_DELETED');
          break;
      }
      affected++;
    }

    return { ok: true, affected, actorName };
  }

  // ---------------------------------------------------------------------------
  // ESCALATIONS
  // ---------------------------------------------------------------------------

  async createEscalation(ticketId: string, dto: CreateEscalationDto, actorUserId: string) {
    const ticket = await this.assertTicket(ticketId);
    const actorName = await this.getActorName(actorUserId);
    const lastEscalation = await this.prisma.supportEscalation.findFirst({ where: { ticketId }, orderBy: { createdAt: 'desc' } });
    const fromLevel = lastEscalation?.toLevel || 'Support';

    const escalation = await this.prisma.supportEscalation.create({
      data: { ticketId, fromLevel, toLevel: dto.toLevel, reason: dto.reason, ownerName: dto.ownerName, createdByName: actorName },
    });
    await this.prisma.supportTicket.update({ where: { id: ticketId }, data: { status: 'ESCALATED' } });

    await this.logEvent(actorUserId, 'Ticket Escalated', `Escalated ticket #${ticket.ticketNumber} from ${fromLevel} to ${dto.toLevel}: ${dto.reason}`, ticketId, ticket.organizationId, 'SUPPORT_TICKET_ESCALATED');
    return escalation;
  }

  async resolveEscalation(escalationId: string, dto: ResolveEscalationDto, actorUserId: string) {
    const escalation = await this.prisma.supportEscalation.findUnique({ where: { id: escalationId }, include: { ticket: true } });
    if (!escalation) throw new NotFoundException('Escalation not found');

    await this.prisma.supportEscalation.update({ where: { id: escalationId }, data: { status: 'Resolved', resolution: dto.resolution, resolvedAt: new Date() } });
    await this.logEvent(actorUserId, 'Escalation Resolved', `Resolved the ${escalation.toLevel} escalation on ticket #${escalation.ticket.ticketNumber}.`, escalation.ticketId, escalation.ticket.organizationId, 'SUPPORT_ESCALATION_RESOLVED');
    return { ok: true };
  }

  async listEscalations(query: { status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const where: any = {};
    if (query.status) where.status = query.status;

    const [total, rows] = await Promise.all([
      this.prisma.supportEscalation.count({ where }),
      this.prisma.supportEscalation.findMany({
        where,
        include: { ticket: { include: { organization: { select: { name: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { data: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ---------------------------------------------------------------------------
  // SLA
  // ---------------------------------------------------------------------------

  async listSlaPolicies() {
    const stored = await this.prisma.supportSlaPolicy.findMany();
    const byPriority = new Map(stored.map((p) => [p.priority, p]));
    return (['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((priority) => byPriority.get(priority) || { priority, ...DEFAULT_SLA_POLICY[priority], id: null, updatedAt: null });
  }

  async updateSlaPolicy(dto: UpdateSlaPolicyDto, actorUserId: string) {
    const actorName = await this.getActorName(actorUserId);
    const updated = await this.prisma.supportSlaPolicy.upsert({
      where: { priority: dto.priority as any },
      update: { firstResponseMinutes: dto.firstResponseMinutes, resolutionMinutes: dto.resolutionMinutes },
      create: { priority: dto.priority as any, firstResponseMinutes: dto.firstResponseMinutes, resolutionMinutes: dto.resolutionMinutes },
    });
    await this.logEvent(actorUserId, 'SLA Policy Updated', `${actorName} updated the ${PRIORITY_LABELS[dto.priority]} SLA policy.`, updated.id, null, 'SUPPORT_SLA_POLICY_UPDATED');
    return updated;
  }

  async getSlaDashboard() {
    const [policyMap, openTickets] = await Promise.all([this.getSlaPolicyMap(), this.prisma.supportTicket.findMany({ where: { status: { in: OPEN_STATUSES } } })]);
    const statuses = openTickets.map((t) => computeSlaStatus(t, policyMap[t.priority] || DEFAULT_SLA_POLICY[t.priority]));

    return {
      overdueTickets: statuses.filter((s) => s.band === 'breached').length,
      upcomingBreaches: statuses.filter((s) => s.band === 'at_risk').length,
      onTrack: statuses.filter((s) => s.band === 'on_track').length,
      policies: await this.listSlaPolicies(),
    };
  }

  // ---------------------------------------------------------------------------
  // KNOWLEDGE BASE
  // ---------------------------------------------------------------------------

  async listKbArticles(query: { search?: string; category?: string; type?: string }) {
    const where: any = { isPublished: true };
    if (query.category) where.category = query.category;
    if (query.type) where.type = query.type;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { body: { contains: query.search, mode: 'insensitive' } },
        { tags: { has: query.search } },
      ];
    }
    return this.prisma.knowledgeBaseArticle.findMany({ where, orderBy: { updatedAt: 'desc' } });
  }

  async getKbArticle(id: string) {
    const article = await this.prisma.knowledgeBaseArticle.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('Article not found');
    await this.prisma.knowledgeBaseArticle.update({ where: { id }, data: { viewCount: { increment: 1 } } });
    return article;
  }

  async createKbArticle(dto: CreateKbArticleDto, actorUserId: string) {
    const actorName = await this.getActorName(actorUserId);
    const slug = `${dto.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now().toString(36)}`;
    const article = await this.prisma.knowledgeBaseArticle.create({
      data: { title: dto.title, slug, category: dto.category, body: dto.body, type: dto.type, tags: dto.tags || [], isPublished: dto.isPublished ?? true, createdByName: actorName },
    });
    await this.logEvent(actorUserId, 'Knowledge Base Article Created', `Published "${dto.title}".`, article.id, null, 'SUPPORT_KB_ARTICLE_CREATED');
    return article;
  }

  async updateKbArticle(id: string, dto: UpdateKbArticleDto, actorUserId: string) {
    const existing = await this.prisma.knowledgeBaseArticle.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Article not found');
    const updated = await this.prisma.knowledgeBaseArticle.update({ where: { id }, data: dto as any });
    await this.logEvent(actorUserId, 'Knowledge Base Article Updated', `Updated "${updated.title}".`, id, null, 'SUPPORT_KB_ARTICLE_UPDATED');
    return updated;
  }

  async removeKbArticle(id: string, actorUserId: string) {
    const existing = await this.prisma.knowledgeBaseArticle.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Article not found');
    await this.prisma.knowledgeBaseArticle.delete({ where: { id } });
    await this.logEvent(actorUserId, 'Knowledge Base Article Deleted', `Deleted "${existing.title}".`, id, null, 'SUPPORT_KB_ARTICLE_DELETED');
    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  // CSAT
  // ---------------------------------------------------------------------------

  async recordCsat(ticketId: string, dto: RecordCsatDto, actorUserId: string) {
    const ticket = await this.assertTicket(ticketId);
    await this.prisma.supportTicket.update({ where: { id: ticketId }, data: { satisfactionScore: dto.score, satisfactionComment: dto.comment } });
    await this.logEvent(actorUserId, 'Customer Satisfaction Recorded', `Recorded a CSAT score of ${dto.score}/5 for ticket #${ticket.ticketNumber}.`, ticketId, ticket.organizationId, 'SUPPORT_CSAT_RECORDED');
    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  // NOTIFICATIONS (derived, UI-only - no delivery infra exists in this codebase)
  // ---------------------------------------------------------------------------

  async getNotifications() {
    const dayAgo = new Date(Date.now() - DAY_MS);
    const policyMap = await this.getSlaPolicyMap();

    const [newTickets, criticalTickets, escalations, openTickets] = await Promise.all([
      this.prisma.supportTicket.findMany({ where: { status: 'NEW', createdAt: { gte: dayAgo } }, include: { organization: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 10 }),
      this.prisma.supportTicket.findMany({ where: { priority: 'URGENT', createdAt: { gte: dayAgo } }, include: { organization: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 10 }),
      this.prisma.supportEscalation.findMany({ where: { createdAt: { gte: dayAgo } }, include: { ticket: { include: { organization: { select: { name: true } } } } }, orderBy: { createdAt: 'desc' }, take: 10 }),
      this.prisma.supportTicket.findMany({ where: { status: { in: OPEN_STATUSES } } }),
    ]);

    const slaWarnings = openTickets
      .map((t) => ({ ticket: t, sla: computeSlaStatus(t, policyMap[t.priority] || DEFAULT_SLA_POLICY[t.priority]) }))
      .filter((x) => x.sla.band === 'at_risk' || x.sla.band === 'breached')
      .slice(0, 10);

    return {
      newTickets: newTickets.map((t) => ({ id: t.id, ticketNumber: t.ticketNumber, subject: t.subject, organizationName: t.organization.name, createdAt: t.createdAt })),
      criticalTickets: criticalTickets.map((t) => ({ id: t.id, ticketNumber: t.ticketNumber, subject: t.subject, organizationName: t.organization.name, createdAt: t.createdAt })),
      escalations: escalations.map((e) => ({ id: e.id, ticketId: e.ticketId, ticketNumber: e.ticket.ticketNumber, toLevel: e.toLevel, organizationName: e.ticket.organization.name, createdAt: e.createdAt })),
      slaWarnings: slaWarnings.map((x) => ({ id: x.ticket.id, ticketNumber: x.ticket.ticketNumber, subject: x.ticket.subject, band: x.sla.band, minutesRemaining: x.sla.minutesRemaining })),
    };
  }

  // ---------------------------------------------------------------------------
  // INTERNAL HELPERS
  // ---------------------------------------------------------------------------

  private async assertTicket(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket as any;
  }

  private async getSlaPolicyMap(): Promise<Record<string, SlaPolicyLike>> {
    const stored = await this.prisma.supportSlaPolicy.findMany();
    const map: Record<string, SlaPolicyLike> = { ...DEFAULT_SLA_POLICY };
    for (const p of stored) map[p.priority] = { firstResponseMinutes: p.firstResponseMinutes, resolutionMinutes: p.resolutionMinutes };
    return map;
  }

  private enrichTicket(ticket: any, policyMap: Record<string, SlaPolicyLike>) {
    const sla = computeSlaStatus(ticket, policyMap[ticket.priority] || DEFAULT_SLA_POLICY[ticket.priority]);
    return {
      ...ticket,
      priorityLabel: PRIORITY_LABELS[ticket.priority] || ticket.priority,
      assignedEngineerName: ticket.assignedEngineerUser?.user?.fullName || ticket.assignedEngineer || null,
      sla,
    };
  }

  private async getActorName(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user?.fullName || 'Platform Admin';
  }

  private async logEvent(actorUserId: string, action: string, details: string, entityId: string, organizationId: string | null, eventType?: string) {
    const actorName = await this.getActorName(actorUserId);
    await this.auditLogsService.logEvent({
      organizationId,
      userId: actorUserId,
      action,
      user: actorName,
      details,
      eventType,
      eventCategory: AUDIT_CATEGORY,
      entityType: 'SupportTicket',
      entityId,
    });
  }
}
