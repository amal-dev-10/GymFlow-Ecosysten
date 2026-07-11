import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';

// Statuses that represent a notification actually delivered to the org (the
// platform campaign fan-out starts at 'Scheduled' then the scheduler advances
// it). Drafts/failed/cancelled/in-flight are never shown to the tenant.
const DELIVERED_STATUSES = ['Sent', 'Delivered'];

/**
 * Tenant-facing announcements — the read side of the platform's
 * Notification fan-out (platform-notifications sends campaigns to orgs). Every
 * query is hard-scoped to the caller's organization.
 */
@Injectable()
export class AnnouncementsService {
  constructor(private prisma: DatabaseService) {}

  async list(organizationId: string) {
    const rows = await this.prisma.notification.findMany({
      where: { organizationId, status: { in: DELIVERED_STATUSES } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      priority: n.priority,
      channel: n.channel,
      notificationType: n.notificationType,
      createdAt: n.createdAt,
      sentAt: n.sentAt,
      readAt: n.readAt,
      read: !!n.readAt,
    }));
  }

  async unreadCount(organizationId: string) {
    const count = await this.prisma.notification.count({
      where: { organizationId, status: { in: DELIVERED_STATUSES }, readAt: null },
    });
    return { count };
  }

  async markRead(organizationId: string, id: string) {
    const notif = await this.prisma.notification.findFirst({ where: { id, organizationId } });
    if (!notif) throw new NotFoundException('Announcement not found');
    if (!notif.readAt) {
      await this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
    }
    return { ok: true };
  }

  async markAllRead(organizationId: string) {
    const res = await this.prisma.notification.updateMany({
      where: { organizationId, status: { in: DELIVERED_STATUSES }, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: res.count };
  }
}
