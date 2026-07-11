import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { CreateSupportTicketDto, PostSupportMessageDto, SupportCsatDto } from './dto/support.dto';

// Statuses a customer perceives as still-active vs done.
const OPEN_STATUSES = ['OPEN', 'NEW', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'ESCALATED'];
const CLOSED_STATUSES = ['RESOLVED', 'CLOSED', 'CANCELLED'];

/**
 * Tenant-facing support desk. This is the customer side of the same
 * SupportTicket tables the platform admin's Support Center manages — every
 * query here is hard-scoped to the caller's organization, and internal notes
 * (SupportTicketMessage.isInternal) are never exposed.
 */
@Injectable()
export class SupportService {
  constructor(private prisma: DatabaseService) {}

  private async getActorName(userId?: string): Promise<string> {
    if (!userId) return 'Member';
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user?.fullName || user?.phoneNumber || 'Staff Member';
  }

  private async assertOwnedTicket(organizationId: string, id: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, organizationId },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async listTickets(organizationId: string, status?: string) {
    const where: any = { organizationId };
    if (status === 'open') where.status = { in: OPEN_STATUSES };
    else if (status === 'closed') where.status = { in: CLOSED_STATUSES };

    const rows = await this.prisma.supportTicket.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          where: { isInternal: false },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return rows.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      category: t.category,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      lastMessage: t.messages[0]?.body || t.description || null,
    }));
  }

  async getTicket(organizationId: string, id: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, organizationId },
      include: {
        messages: {
          where: { isInternal: false },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      createdByName: ticket.createdByName,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      resolvedAt: ticket.resolvedAt,
      satisfactionScore: ticket.satisfactionScore,
      messages: ticket.messages.map((m) => ({
        id: m.id,
        authorType: m.authorType,
        authorName: m.authorName,
        body: m.body,
        createdAt: m.createdAt,
      })),
    };
  }

  async createTicket(organizationId: string, userId: string | undefined, dto: CreateSupportTicketDto) {
    const name = await this.getActorName(userId);

    const ticket = await this.prisma.supportTicket.create({
      data: {
        organizationId,
        subject: dto.subject,
        description: dto.description,
        priority: (dto.priority as any) || 'MEDIUM',
        category: dto.category,
        createdByName: name,
        status: 'OPEN',
      },
    });

    // Seed the opening message from the description so the ticket reads as a
    // conversation thread from the first bubble.
    if (dto.description?.trim()) {
      await this.prisma.supportTicketMessage.create({
        data: {
          ticketId: ticket.id,
          authorType: 'Customer',
          authorName: name,
          body: dto.description.trim(),
          isInternal: false,
        },
      });
    }

    return this.getTicket(organizationId, ticket.id);
  }

  async postMessage(organizationId: string, userId: string | undefined, id: string, dto: PostSupportMessageDto) {
    const ticket = await this.assertOwnedTicket(organizationId, id);
    const name = await this.getActorName(userId);

    await this.prisma.supportTicketMessage.create({
      data: {
        ticketId: id,
        authorType: 'Customer',
        authorName: name,
        body: dto.body,
        isInternal: false,
      },
    });

    // A customer reply on a done ticket reopens it so staff pick it back up.
    const reopen = CLOSED_STATUSES.includes(ticket.status);
    await this.prisma.supportTicket.update({
      where: { id },
      data: { status: reopen ? 'OPEN' : ticket.status, resolvedAt: reopen ? null : undefined },
    });

    return this.getTicket(organizationId, id);
  }

  async recordCsat(organizationId: string, id: string, dto: SupportCsatDto) {
    const ticket = await this.assertOwnedTicket(organizationId, id);
    if (!['RESOLVED', 'CLOSED'].includes(ticket.status)) {
      throw new BadRequestException('Only resolved tickets can be rated');
    }
    await this.prisma.supportTicket.update({
      where: { id },
      data: { satisfactionScore: dto.score, satisfactionComment: dto.comment },
    });
    return this.getTicket(organizationId, id);
  }
}
