import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: DatabaseService,
    private realtimeGateway: RealtimeGateway,
    private auditLogsService: AuditLogsService,
  ) {}

  private async getActorName(userId?: string): Promise<string> {
    if (!userId) return 'System';
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user?.fullName || user?.phoneNumber || 'Staff Member';
  }

  /**
   * Recompute occupancy for a gym and broadcast it over the realtime gateway.
   */
  private async emitOccupancyUpdate(orgId: string, gymId: string) {
    const gym = await this.prisma.gym.findFirst({
      where: { id: gymId, organizationId: orgId },
    });
    if (!gym) return;

    const current = await this.prisma.attendance.count({
      where: { gymId, status: 'Granted', checkOutTime: null },
    });

    const gymSettings = (gym.settings as any) || {};
    const capacity = gym.capacity || Number(gymSettings.maxCapacity) || Number(gymSettings.capacity) || 0;
    const available = Math.max(capacity - current, 0);
    const percent = capacity > 0 ? Math.round((current / capacity) * 100) : 0;
    let status: 'normal' | 'busy' | 'full' = 'normal';
    if (percent >= 100) status = 'full';
    else if (percent >= 80) status = 'busy';

    this.realtimeGateway.emitOccupancyUpdate(gymId, { capacity, current, available, percent, status });
  }

  /**
   * Check in a member or guest.
   */
  async checkIn(
    orgId: string,
    dto: {
      memberId?: string;
      gymId: string;
      method: string;
      memberName?: string; // For guests or unregistered tags
      recordedBy?: string;
      deviceUsed?: string;
    },
    actorUserId?: string,
  ) {
    const { memberId, gymId, method, memberName, recordedBy, deviceUsed } = dto;

    // Check branch existence
    const gym = await this.prisma.gym.findFirst({
      where: { id: gymId, organizationId: orgId },
    });
    if (!gym) {
      throw new NotFoundException('Branch location not found');
    }

    const settings = (gym.settings as any) || {};

    if (settings.trackingEnabled === false) {
      throw new BadRequestException('Attendance tracking is globally disabled for this branch.');
    }

    // Match method names loosely (case-insensitive substring) since callers use varying
    // labels for the same channel: the terminal UI sends 'Manual Search'/'QR Code'/
    // 'RFID Card'/'Face Recognition'/'Barcode Scan', while device adapters (e.g. the
    // hardware simulator) send the shorter 'Manual'/'QR'/'RFID'/'Face'/'Barcode' forms.
    // 'Override: ...' methods intentionally bypass these checks - they're privileged
    // staff actions, not a check-in channel toggled here.
    const methodKey = method.toLowerCase();
    const isMethod = (...keywords: string[]) => keywords.some((k) => methodKey.includes(k));
    const blockedChannel =
      (isMethod('manual') && settings.allowManualCheckIn === false && 'Manual lookup check-in is disabled.') ||
      (isMethod('qr') && settings.allowQrCheckIn === false && 'QR check-in is disabled.') ||
      (isMethod('barcode') && settings.allowBarcodeCheckIn === false && 'Barcode check-in is disabled.') ||
      (isMethod('mobile') && settings.allowMobileCheckIn === false && 'Mobile App check-in is disabled.') ||
      (isMethod('fingerprint') && settings.allowFingerprintCheckIn === false && 'Fingerprint check-in is disabled.') ||
      (isMethod('rfid') && settings.allowRfidCheckIn === false && 'RFID check-in is disabled.') ||
      (isMethod('face') && settings.allowFaceCheckIn === false && 'Face recognition check-in is disabled.');

    if (blockedChannel) {
      throw new BadRequestException(blockedChannel);
    }

    // 1. If no memberId is provided (e.g. Guest Check-In), log as granted guest immediately
    if (!memberId) {
      if (settings.allowGuestCheckIn === false) {
        throw new BadRequestException('Guest access passes are currently disabled.');
      }
      const attendance = await this.prisma.attendance.create({
        data: {
          organizationId: orgId,
          gymId,
          memberName: memberName || 'Walk-In Guest',
          method,
          status: 'Granted',
          recordedBy: recordedBy || 'System Terminal',
          deviceUsed: deviceUsed || 'Front Gate',
        },
      });
      this.realtimeGateway.emitCheckIn(gymId, attendance);
      await this.emitOccupancyUpdate(orgId, gymId);

      const guestActorName = await this.getActorName(actorUserId);
      await this.auditLogsService.logEvent({
        organizationId: orgId,
        userId: actorUserId,
        action: 'Guest Checked In',
        user: guestActorName,
        details: `Checked in guest "${attendance.memberName}" via ${method} at ${gym.name}.`,
        eventType: 'ATTENDANCE_CHECK_IN',
        eventCategory: 'Attendance',
        entityType: 'Attendance',
        entityId: attendance.id,
      });

      return {
        success: true,
        status: 'Granted',
        attendance,
      };
    }

    // 2. Lookup member
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, organizationId: orgId },
    });

    if (!member) {
      // Record denied entry for unknown/unregistered ID
      const attendance = await this.prisma.attendance.create({
        data: {
          organizationId: orgId,
          gymId,
          memberName: memberName || `ID: ${memberId}`,
          method,
          status: 'Denied',
          reason: 'Member profile not found',
          recordedBy: recordedBy || 'System Terminal',
          deviceUsed: deviceUsed || 'Front Gate',
        },
      });
      // Denials on the member-lookup path never reached emitValidation before,
      // so this attempt was invisible to every other page/device in the
      // workspace - only the terminal that triggered it (via its own REST
      // response) ever knew it happened.
      this.realtimeGateway.emitValidation(gymId, {
        memberId,
        memberName: attendance.memberName,
        status: 'Denied',
        reason: 'Member profile not found',
      });

      const unknownActorName = await this.getActorName(actorUserId);
      await this.auditLogsService.logEvent({
        organizationId: orgId,
        userId: actorUserId,
        action: 'Check-In Denied',
        user: unknownActorName,
        details: `Denied check-in attempt for unknown member ID "${memberId}" at ${gym.name}.`,
        eventType: 'ATTENDANCE_CHECK_IN_DENIED',
        eventCategory: 'Attendance',
        entityType: 'Attendance',
        entityId: attendance.id,
      });

      return {
        success: false,
        status: 'Denied',
        reason: 'Member profile not found',
        attendance,
      };
    }

    // 3. Run validation layers
    const validationResult = await this.validateCheckIn(orgId, gymId, memberId);

    // Save attendance check-in record based on validation result
    const attendance = await this.prisma.attendance.create({
      data: {
        organizationId: orgId,
        gymId,
        memberId,
        memberName: `${member.firstName} ${member.lastName}`,
        method,
        status: validationResult.success ? 'Granted' : 'Denied',
        reason: validationResult.success ? (validationResult.status === 'Warning' ? validationResult.reason : null) : validationResult.reason,
        recordedBy: recordedBy || 'System Terminal',
        deviceUsed: deviceUsed || 'Front Gate',
        trainerNotified: validationResult.success,
      },
    });

    if (validationResult.success) {
      this.realtimeGateway.emitCheckIn(gymId, attendance);
    }
    this.realtimeGateway.emitValidation(gymId, {
      memberId,
      memberName: attendance.memberName,
      status: validationResult.status,
      reason: validationResult.reason,
      layers: validationResult.layers,
    });
    await this.emitOccupancyUpdate(orgId, gymId);

    const actorName = await this.getActorName(actorUserId);
    await this.auditLogsService.logEvent({
      organizationId: orgId,
      userId: actorUserId,
      action: validationResult.success ? 'Member Checked In' : 'Check-In Denied',
      user: actorName,
      details: validationResult.success
        ? `${member.firstName} ${member.lastName} checked in via ${method} at ${gym.name}.`
        : `Denied check-in for ${member.firstName} ${member.lastName} at ${gym.name}. Reason: ${validationResult.reason}.`,
      eventType: validationResult.success ? 'ATTENDANCE_CHECK_IN' : 'ATTENDANCE_CHECK_IN_DENIED',
      eventCategory: 'Attendance',
      entityType: 'Attendance',
      entityId: attendance.id,
    });

    return {
      success: validationResult.success,
      status: validationResult.status,
      reason: validationResult.reason,
      member: validationResult.member,
      layers: validationResult.layers,
      attendance,
    };
  }

  /**
   * Check out a member.
   */
  async checkOut(orgId: string, id: string, actorUserId?: string) {
    let attendance = await this.prisma.attendance.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!attendance) {
      // Fallback: see if "id" is actually a memberId with an active check-in session
      attendance = await this.prisma.attendance.findFirst({
        where: { memberId: id, organizationId: orgId, checkOutTime: null },
        orderBy: { checkInTime: 'desc' },
      });
    }

    if (!attendance) {
      throw new NotFoundException('Check-in session record not found');
    }

    if (attendance.checkOutTime) {
      throw new BadRequestException('Session already checked out');
    }

    // Use the resolved record's id — `id` may have been a memberId (the fallback
    // above looks up the active session by member), so updating by the raw param
    // would miss the row.
    const updated = await this.prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOutTime: new Date(),
      },
    });

    this.realtimeGateway.emitCheckOut(updated.gymId, updated);
    await this.emitOccupancyUpdate(orgId, updated.gymId);

    const actorName = await this.getActorName(actorUserId);
    await this.auditLogsService.logEvent({
      organizationId: orgId,
      userId: actorUserId,
      action: 'Member Checked Out',
      user: actorName,
      details: `${updated.memberName || 'Member'} checked out.`,
      eventType: 'ATTENDANCE_CHECK_OUT',
      eventCategory: 'Attendance',
      entityType: 'Attendance',
      entityId: updated.id,
    });

    return {
      success: true,
      attendance: updated,
    };
  }

  /**
   * Bulk check out active sessions.
   */
  async bulkCheckOut(orgId: string, ids: string[], actorUserId?: string) {
    const affected = await this.prisma.attendance.findMany({
      where: {
        id: { in: ids },
        organizationId: orgId,
        checkOutTime: null,
      },
      select: { gymId: true },
    });

    const result = await this.prisma.attendance.updateMany({
      where: {
        id: { in: ids },
        organizationId: orgId,
        checkOutTime: null,
      },
      data: {
        checkOutTime: new Date(),
      },
    });

    const affectedGymIds = Array.from(new Set(affected.map((a) => a.gymId)));
    for (const gymId of affectedGymIds) {
      this.realtimeGateway.emitCheckOut(gymId, { ids });
      await this.emitOccupancyUpdate(orgId, gymId);
    }

    if (result.count > 0) {
      const actorName = await this.getActorName(actorUserId);
      await this.auditLogsService.logEvent({
        organizationId: orgId,
        userId: actorUserId,
        action: 'Bulk Checked Out',
        user: actorName,
        details: `Checked out ${result.count} active session(s) in bulk.`,
        eventType: 'ATTENDANCE_BULK_CHECK_OUT',
        eventCategory: 'Attendance',
      });
    }

    return {
      success: true,
      count: result.count,
    };
  }

  /**
   * Manual correction of check-in / check-out times.
   */
  async correctRecord(
    orgId: string,
    id: string,
    dto: {
      checkInTime: string; // HH:MM
      checkOutTime: string; // HH:MM
      reason: string;
    },
    actorUserId?: string,
  ) {
    const record = await this.prisma.attendance.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!record) {
      throw new NotFoundException('Attendance record not found');
    }

    // Parse times
    const today = new Date();
    const [inH, inM] = dto.checkInTime.split(':').map(Number);
    const [outH, outM] = dto.checkOutTime.split(':').map(Number);

    const checkInDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), inH, inM);
    const checkOutDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), outH, outM);

    const updated = await this.prisma.attendance.update({
      where: { id },
      data: {
        checkInTime: checkInDate,
        checkOutTime: checkOutDate,
        reason: dto.reason,
      },
    });

    const actorName = await this.getActorName(actorUserId);
    await this.auditLogsService.logEvent({
      organizationId: orgId,
      userId: actorUserId,
      action: 'Attendance Corrected',
      user: actorName,
      details: `Corrected record for ${record.memberName}. In: ${dto.checkInTime}, Out: ${dto.checkOutTime}. Reason: ${dto.reason}`,
      eventType: 'ATTENDANCE_CORRECTED',
      eventCategory: 'Attendance',
      entityType: 'Attendance',
      entityId: id,
    });

    await this.emitOccupancyUpdate(orgId, updated.gymId);

    return {
      success: true,
      attendance: updated,
    };
  }

  /**
   * List currently checked-in active sessions.
   */
  async listActive(orgId: string, gymId?: string) {
    const where: any = {
      organizationId: orgId,
      status: 'Granted',
      checkOutTime: null,
    };
    if (gymId && gymId !== 'all') {
      where.gymId = gymId;
    }

    const list = await this.prisma.attendance.findMany({
      where,
      include: {
        gym: true,
        member: {
          include: {
            memberMemberships: {
              where: { status: 'Active' },
              include: { membershipPlan: true },
            },
          },
        },
      },
      orderBy: { checkInTime: 'desc' },
    });

    return list.map((record) => {
      const activeSub = record.member?.memberMemberships?.[0];
      const gymSettings = (record.gym?.settings as any) || {};
      const maxSessionDuration = Number(gymSettings.maxSessionDuration) || 180;
      const elapsedMinutes = Math.round((new Date().getTime() - record.checkInTime.getTime()) / 60000);

      // Reflects whether this member actually has a currently-active membership,
      // not just whether a Member row exists - a member with no active plan or
      // an expired/lapsed subscription is flagged here.
      const status = !record.member ? 'Guest' : activeSub ? 'Active' : 'Expired';

      return {
        id: record.id,
        name: record.memberName || `${record.member?.firstName} ${record.member?.lastName}`,
        memberId: record.memberId || 'GUEST',
        phone: record.member?.phoneNumber || 'N/A',
        status,
        checkInTime: record.checkInTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        checkInTimeRaw: record.checkInTime,
        checkInDate: record.checkInTime.toISOString().split('T')[0],
        elapsedMinutes,
        maxSessionDuration,
        isOverLimit: elapsedMinutes > maxSessionDuration,
        planName: activeSub?.membershipPlan?.name || (record.member ? 'No Active Plan' : 'Walk-In Guest'),
        trainerName: record.member ? 'Trainer Frank' : undefined,
        branchName: record.gym?.name || record.gymId,
        branchId: record.gymId,
      };
    });
  }

  /**
   * List recent checkin history/timelines logs.
   */
  async listLogs(orgId: string, gymId?: string) {
    const where: any = { organizationId: orgId };
    if (gymId && gymId !== 'all') {
      where.gymId = gymId;
    }

    // Consumers (the terminal's "Live Terminal Log Timeline" and the workspace
    // sidebar's "recent activity") both label this as today's events - the query
    // previously ignored that and returned the 50 most-recent records ever,
    // surfacing stale/old entries once a branch built up history.
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    where.checkInTime = { gte: startOfToday };

    const logs = await this.prisma.attendance.findMany({
      where,
      include: { gym: true },
      orderBy: { checkInTime: 'desc' },
      take: 50,
    });

    return logs.map((log) => {
      let durationText = '';
      let checkoutStr: string | undefined = undefined;
      if (log.checkOutTime) {
        const diffMins = Math.round((log.checkOutTime.getTime() - log.checkInTime.getTime()) / 60000);
        const hrs = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        durationText = hrs > 0 ? `${hrs} Hr${hrs !== 1 ? 's' : ''} ${mins} Mins` : `${mins} Mins`;
        checkoutStr = log.checkOutTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      }

      return {
        id: log.id,
        memberName: log.memberName,
        memberId: log.memberId || 'GUEST',
        branchName: log.gym?.name || log.gymId,
        branchId: log.gymId,
        checkInTime: log.checkInTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        checkOutTime: checkoutStr,
        checkInTimeRaw: log.checkInTime,
        checkOutTimeRaw: log.checkOutTime,
        durationText,
        method: log.method,
        status: log.status,
        reason: log.reason,
        trainerNotified: log.trainerNotified,
      };
    });
  }

  /**
   * Get stats for checkins.
   */
  async getStats(orgId: string, gymId?: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const whereActive: any = {
      organizationId: orgId,
      status: 'Granted',
      checkOutTime: null,
    };
    if (gymId && gymId !== 'all') {
      whereActive.gymId = gymId;
    }

    const activeInside = await this.prisma.attendance.count({
      where: whereActive,
    });

    const whereTotal: any = {
      organizationId: orgId,
      status: 'Granted',
      checkInTime: { gte: todayStart },
    };
    if (gymId && gymId !== 'all') {
      whereTotal.gymId = gymId;
    }

    const totalCheckInsToday = await this.prisma.attendance.count({
      where: whereTotal,
    });

    const whereDenied: any = {
      organizationId: orgId,
      status: 'Denied',
      createdAt: { gte: todayStart },
    };
    if (gymId && gymId !== 'all') {
      whereDenied.gymId = gymId;
    }

    const totalDenied = await this.prisma.attendance.count({
      where: whereDenied,
    });

    return {
      activeInside,
      totalCheckInsToday,
      totalDenied,
    };
  }

  /**
   * Advanced query & search logic for attendance records.
   */
  async searchRecords(
    orgId: string,
    filters: {
      query?: string;
      gymId?: string;
      status?: string;
      method?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 25;
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId: orgId,
    };

    if (filters.gymId) {
      where.gymId = filters.gymId;
    }

    if (filters.method) {
      where.method = filters.method;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.checkInTime = {};
      if (filters.dateFrom) {
        where.checkInTime.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        // A date-only string (e.g. "2026-06-30") parses as midnight UTC, which as
        // an upper bound excluded the entire day it was meant to include (e.g. the
        // "Today's Attendance" saved filter set dateFrom===dateTo===today and
        // matched nothing). Push the bound to the end of that day instead.
        const endOfDay = new Date(filters.dateTo);
        endOfDay.setUTCHours(23, 59, 59, 999);
        where.checkInTime.lte = endOfDay;
      }
    }

    if (filters.status) {
      switch (filters.status) {
        case 'Active Session':
          where.status = 'Granted';
          where.checkOutTime = null;
          break;
        case 'Checked Out':
          where.status = 'Granted';
          where.checkOutTime = { not: null };
          break;
        case 'Denied Entry':
          where.status = 'Denied';
          break;
        case 'Auto Checked Out':
          where.checkoutMethod = 'Auto-closing';
          break;
        case 'Corrected':
          where.reason = { not: null };
          break;
        case 'Missed Check-Out':
          where.OR = [
            { checkoutMethod: 'Auto-closing' },
            {
              checkOutTime: null,
              checkInTime: { lt: new Date(Date.now() - 12 * 60 * 60 * 1000) }
            }
          ];
          break;
        default:
          where.status = filters.status;
      }
    }

    if (filters.query) {
      const q = filters.query.trim();
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { memberName: { contains: q, mode: 'insensitive' } },
        { memberId: { contains: q, mode: 'insensitive' } },
        {
          member: {
            OR: [
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
              { phoneNumber: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [total, records] = await Promise.all([
      this.prisma.attendance.count({ where }),
      this.prisma.attendance.findMany({
        where,
        include: {
          member: {
            include: {
              memberMemberships: {
                where: { status: 'Active' },
                include: { membershipPlan: true },
              },
            },
          },
          gym: true,
        },
        orderBy: { checkInTime: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const items = records.map((record) => {
      const activeSub = record.member?.memberMemberships?.[0];
      let durationText = 'N/A';
      let elapsedMinutes = 0;
      if (record.checkOutTime) {
        elapsedMinutes = Math.round((record.checkOutTime.getTime() - record.checkInTime.getTime()) / 60000);
        const hrs = Math.floor(elapsedMinutes / 60);
        const mins = elapsedMinutes % 60;
        durationText = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
      } else if (record.status === 'Granted') {
        elapsedMinutes = Math.round((new Date().getTime() - record.checkInTime.getTime()) / 60000);
        const hrs = Math.floor(elapsedMinutes / 60);
        const mins = elapsedMinutes % 60;
        durationText = hrs > 0 ? `${hrs}h ${mins}m (Active)` : `${mins}m (Active)`;
      }

      return {
        id: record.id,
        memberName: record.memberName || `${record.member?.firstName} ${record.member?.lastName}` || 'Guest Member',
        memberId: record.memberId || 'GUEST',
        phone: record.member?.phoneNumber || 'N/A',
        branchId: record.gymId,
        branchName: record.gym.name,
        checkInTime: record.checkInTime,
        checkOutTime: record.checkOutTime,
        durationText,
        elapsedMinutes,
        method: record.method,
        status: record.status === 'Denied' ? 'Denied Entry' : (record.checkOutTime ? 'Checked Out' : 'Active Session'),
        reason: record.reason,
        recordedBy: record.recordedBy || 'System Terminal',
        deviceUsed: record.deviceUsed || 'Main Gate',
        checkoutMethod: record.checkoutMethod,
        planName: activeSub?.membershipPlan?.name || 'Walk-In Guest',
        trainerName: record.member ? 'Trainer Frank' : undefined,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Aggregate attendance data to construct trend charts, heatmaps, and stats.
   */
  async getAnalytics(orgId: string, gymId?: string) {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const where: any = {
      organizationId: orgId,
      status: 'Granted',
      checkInTime: { gte: thirtyDaysAgo },
    };
    if (gymId) {
      where.gymId = gymId;
    }

    const records = await this.prisma.attendance.findMany({
      where,
      include: { gym: true },
    });

    // 1. Daily Trends
    const dailyMap = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      dailyMap.set(d.toISOString().split('T')[0], 0);
    }

    // 2. Peak Hours (0-23)
    const hourCounts = new Array(24).fill(0);

    // 3. Heatmap Matrix (7 days x 24 hours)
    const heatmap = Array.from({ length: 7 }, () => new Array(24).fill(0));

    // 4. Branch analytics
    const branchMap = new Map<string, { count: number; name: string; stays: number[]; denied: number }>();

    let totalStayDurationMinutes = 0;
    let stayCount = 0;

    records.forEach((r) => {
      const dateStr = r.checkInTime.toISOString().split('T')[0];
      if (dailyMap.has(dateStr)) {
        dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + 1);
      }

      const hour = r.checkInTime.getHours();
      hourCounts[hour]++;

      const dayOfWeek = r.checkInTime.getDay();
      heatmap[dayOfWeek][hour]++;

      const brInfo = branchMap.get(r.gymId) || { count: 0, name: r.gym.name, stays: [], denied: 0 };
      brInfo.count++;

      if (r.checkOutTime) {
        const stay = Math.round((r.checkOutTime.getTime() - r.checkInTime.getTime()) / 60000);
        totalStayDurationMinutes += stay;
        stayCount++;
        brInfo.stays.push(stay);
      }
      branchMap.set(r.gymId, brInfo);
    });

    // Count Denied Entries too for Branch Analytics
    const deniedRecords = await this.prisma.attendance.findMany({
      where: {
        organizationId: orgId,
        status: 'Denied',
        checkInTime: { gte: thirtyDaysAgo },
      },
      include: { gym: true },
    });

    deniedRecords.forEach((dr) => {
      const brInfo = branchMap.get(dr.gymId) || { count: 0, name: dr.gym.name, stays: [], denied: 0 };
      brInfo.denied++;
      branchMap.set(dr.gymId, brInfo);
    });

    const dailyTrends = Array.from(dailyMap.entries()).map(([date, count]) => ({
      date,
      count,
    })).sort((a, b) => a.date.localeCompare(b.date));

    const peakHours = hourCounts.map((count, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      count,
    }));

    const branchAnalytics = Array.from(branchMap.entries()).map(([branchId, info]) => {
      const avgDur = info.stays.length > 0
        ? Math.round(info.stays.reduce((a, b) => a + b, 0) / info.stays.length)
        : 0;
      return {
        branchId,
        branchName: info.name,
        attendanceCount: info.count,
        averageDuration: avgDur,
        deniedEntries: info.denied,
        occupancyRate: Math.min(Math.round((info.count / 150) * 100), 100),
      };
    });

    const memberInsights = [
      { id: 'm-1', name: 'John Doe', visits: 22, streak: 6, frequency: '4.8x/wk', status: 'Active' },
      { id: 'm-2', name: 'Jane Smith', visits: 19, streak: 4, frequency: '3.9x/wk', status: 'Active' },
      { id: 'm-3', name: 'Robert Johnson', visits: 16, streak: 3, frequency: '3.5x/wk', status: 'Active' },
      { id: 'm-4', name: 'Emily Davis', visits: 2, streak: 0, frequency: '0.4x/wk', status: 'Retention Risk' },
    ];

    const trainerInsights = [
      { trainer: 'Trainer Frank', assignedMembers: 20, attendanceRate: 88, memberEngagement: 95, retentionPerformance: 'Exceptional' },
      { trainer: 'Trainer Sarah', assignedMembers: 14, attendanceRate: 74, memberEngagement: 80, retentionPerformance: 'Good' },
      { trainer: 'Trainer Mike', assignedMembers: 18, attendanceRate: 60, memberEngagement: 68, retentionPerformance: 'Needs Review' },
    ];

    // Status distribution
    const activeInside = records.filter(r => !r.checkOutTime).length;
    const checkedOutCount = records.filter(r => r.checkOutTime).length;
    const autoCheckedOutCount = records.filter(r => r.checkoutMethod === 'Auto-closing').length;
    const deniedCount = deniedRecords.length;
    const correctedCount = records.filter(r => r.reason).length;

    const statusDistribution = {
      checkedIn: activeInside,
      checkedOut: checkedOutCount,
      autoCheckedOut: autoCheckedOutCount,
      deniedEntry: deniedCount,
      corrected: correctedCount,
    };

    // Employee attendance
    const employeeAttendance = {
      present: 8,
      absent: 1,
      late: 1,
      coverageRate: 88,
    };

    // Forecasting today/tomorrow
    const forecasting = {
      expectedToday: Math.round(activeInside * 1.4 + 10),
      expectedThisWeek: records.length + 45,
      peakOccupancyForecast: 75,
      capacityPlanningInsight: 'Maximum capacity expected between 5:30 PM and 7:30 PM.',
    };

    // Revenue/renewal correlation
    const revenueCorrelation = {
      attendanceVsRenewals: [
        { attendanceRate: '0-20%', renewalRate: 18 },
        { attendanceRate: '21-40%', renewalRate: 40 },
        { attendanceRate: '41-60%', renewalRate: 62 },
        { attendanceRate: '61-80%', renewalRate: 80 },
        { attendanceRate: '81-100%', renewalRate: 94 },
      ],
      retentionRate: 86,
    };

    return {
      dailyTrends,
      peakHours,
      heatmap,
      branchAnalytics,
      memberInsights,
      trainerInsights,
      statusDistribution,
      employeeAttendance,
      forecasting,
      revenueCorrelation,
      averageVisitDuration: stayCount > 0 ? Math.round(totalStayDurationMinutes / stayCount) : 60,
    };
  }

  /**
   * Retrieve attendance exceptions (e.g. denied entries, missed check-outs).
   */
  async getExceptions(orgId: string, gymId?: string) {
    const where: any = {
      organizationId: orgId,
      OR: [
        { status: 'Denied' },
        { checkoutMethod: 'Auto-closing' },
        {
          checkOutTime: null,
          checkInTime: { lt: new Date(Date.now() - 12 * 60 * 60 * 1000) }
        }
      ]
    };
    if (gymId) {
      where.gymId = gymId;
    }

    const records = await this.prisma.attendance.findMany({
      where,
      include: { gym: true, member: true },
      orderBy: { checkInTime: 'desc' },
      take: 20,
    });

    return records.map((r) => {
      let exceptionType = 'Denied Entry';
      let severity = 'high';
      if (r.status === 'Granted') {
        if (r.checkoutMethod === 'Auto-closing') {
          exceptionType = 'Missed Check-Out (Auto)';
          severity = 'medium';
        } else {
          exceptionType = 'Active Session Conflict';
          severity = 'low';
        }
      }
      return {
        id: r.id,
        memberName: r.memberName || `${r.member?.firstName} ${r.member?.lastName}` || 'Guest Member',
        memberId: r.memberId || 'GUEST',
        branchName: r.gym.name,
        checkInTime: r.checkInTime,
        exceptionType,
        reason: r.reason || 'Auto checked out due to branch closing rule',
        severity,
      };
    });
  }

  /**
   * Bulk correction of attendance record checkin/checkout times.
   */
  async bulkCorrect(
    orgId: string,
    dto: {
      ids: string[];
      checkInTime: string; // HH:MM
      checkOutTime: string; // HH:MM
      reason: string;
    },
    actorUserId?: string,
  ) {
    const today = new Date();
    const [inH, inM] = dto.checkInTime.split(':').map(Number);
    const [outH, outM] = dto.checkOutTime.split(':').map(Number);

    const checkInDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), inH, inM);
    const checkOutDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), outH, outM);

    const affected = await this.prisma.attendance.findMany({
      where: {
        id: { in: dto.ids },
        organizationId: orgId,
      },
      select: { gymId: true },
    });

    const result = await this.prisma.attendance.updateMany({
      where: {
        id: { in: dto.ids },
        organizationId: orgId,
      },
      data: {
        checkInTime: checkInDate,
        checkOutTime: checkOutDate,
        reason: dto.reason,
      },
    });

    const actorName = await this.getActorName(actorUserId);
    await this.auditLogsService.logEvent({
      organizationId: orgId,
      userId: actorUserId,
      action: 'Bulk Attendance Corrected',
      user: actorName,
      details: `Bulk corrected ${result.count} attendance records. New check-in: ${dto.checkInTime}, New check-out: ${dto.checkOutTime}. Reason: ${dto.reason}`,
      eventType: 'ATTENDANCE_BULK_CORRECTED',
      eventCategory: 'Attendance',
    });

    const affectedGymIds = Array.from(new Set(affected.map((a) => a.gymId)));
    for (const gymId of affectedGymIds) {
      await this.emitOccupancyUpdate(orgId, gymId);
    }

    return {
      success: true,
      count: result.count,
    };
  }

  // --- MEMBERSHIP VALIDATION ENGINE METHODS ---

  async getValidationRules(orgId: string, gymId: string) {
    const gym = await this.prisma.gym.findFirst({
      where: { id: gymId, organizationId: orgId },
    });
    if (!gym) {
      throw new NotFoundException('Branch location not found');
    }

    const settings = (gym.settings as any) || {};
    return {
      ...settings,
      blockExpired: settings.blockExpired !== false,
      blockFrozen: settings.blockFrozen !== false,
      allowGracePeriod: !!settings.allowGracePeriod,
      gracePeriodDays: Number(settings.gracePeriodDays) || 3,
      outstandingBalanceRule: settings.financialValidation || settings.outstandingBalanceRule || 'warn', // ignore, warn, block
      maxOccupancyPercent: Number(settings.maxOccupancyPercent) || 100,
      capacity: Number(settings.capacity) || Number(settings.maxCapacity) || 150,
    };
  }

  async saveValidationRules(orgId: string, gymId: string, rules: any, actorUserId?: string) {
    const gym = await this.prisma.gym.findFirst({
      where: { id: gymId, organizationId: orgId },
    });
    if (!gym) {
      throw new NotFoundException('Branch location not found');
    }

    const currentSettings = (gym.settings as any) || {};
    const updatedSettings = {
      ...currentSettings,
      ...rules,
      blockExpired: rules.blockExpired !== undefined ? rules.blockExpired : rules.validateExpiry,
      blockFrozen: rules.blockFrozen !== undefined ? rules.blockFrozen : rules.validateFreeze,
      allowGracePeriod: rules.allowGracePeriod !== undefined ? rules.allowGracePeriod : (rules.gracePeriod > 0),
      gracePeriodDays: Number(rules.gracePeriodDays) || currentSettings.gracePeriodDays,
      outstandingBalanceRule: rules.financialValidation || rules.outstandingBalanceRule,
      maxOccupancyPercent: Number(rules.maxOccupancyPercent) || currentSettings.maxOccupancyPercent,
      capacity: Number(rules.maxCapacity) || Number(rules.capacity) || currentSettings.capacity || 150,
    };

    await this.prisma.gym.update({
      where: { id: gymId },
      data: {
        settings: updatedSettings,
      },
    });

    const actorName = await this.getActorName(actorUserId);
    await this.auditLogsService.logEvent({
      organizationId: orgId,
      userId: actorUserId,
      action: 'Validation Rules Configured',
      user: actorName,
      details: `Updated membership validation rules. Block Expired: ${rules.blockExpired}, Block Frozen: ${rules.blockFrozen}, Outstanding Balance Policy: ${rules.outstandingBalanceRule}`,
      eventType: 'ATTENDANCE_VALIDATION_RULES_UPDATED',
      eventCategory: 'Configuration',
    });

    return {
      success: true,
      rules: updatedSettings,
    };
  }

  async getValidationStats(orgId: string, gymId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [successCount, failedCount, expiredAttempts, branchViolations, paymentViolations, deniedEntries] = await Promise.all([
      // Successful checkins today
      this.prisma.attendance.count({
        where: {
          organizationId: orgId,
          gymId,
          status: 'Granted',
          checkInTime: { gte: todayStart },
        },
      }),
      // Failed validations today
      this.prisma.attendance.count({
        where: {
          organizationId: orgId,
          gymId,
          status: 'Denied',
          checkInTime: { gte: todayStart },
        },
      }),
      // Expired membership attempts today
      this.prisma.attendance.count({
        where: {
          organizationId: orgId,
          gymId,
          status: 'Denied',
          reason: { contains: 'Expired' },
          checkInTime: { gte: todayStart },
        },
      }),
      // Branch access violations today
      this.prisma.attendance.count({
        where: {
          organizationId: orgId,
          gymId,
          status: 'Denied',
          reason: { contains: 'Branch' },
          checkInTime: { gte: todayStart },
        },
      }),
      // Payment violations today
      this.prisma.attendance.count({
        where: {
          organizationId: orgId,
          gymId,
          status: 'Denied',
          reason: { contains: 'Outstanding' },
          checkInTime: { gte: todayStart },
        },
      }),
      // Denied entries (any Denied status)
      this.prisma.attendance.count({
        where: {
          organizationId: orgId,
          gymId,
          status: 'Denied',
          checkInTime: { gte: todayStart },
        },
      }),
    ]);

    // Let's get failure reasons distribution for chart
    const logs = await this.prisma.attendance.findMany({
      where: {
        organizationId: orgId,
        gymId,
        status: 'Denied',
        checkInTime: { gte: todayStart },
      },
      select: { reason: true },
    });

    const reasonDistribution: Record<string, number> = {};
    logs.forEach((log) => {
      const reason = log.reason || 'Unknown Reason';
      reasonDistribution[reason] = (reasonDistribution[reason] || 0) + 1;
    });

    return {
      successfulValidations: successCount,
      failedValidations: failedCount,
      expiredAttempts,
      branchViolations,
      outstandingPaymentViolations: paymentViolations,
      deniedEntries,
      reasonDistribution,
    };
  }

  async executeOverride(
    orgId: string,
    dto: {
      memberId: string;
      gymId: string;
      reason: string;
      approverName: string;
      notes?: string;
      deviceUsed?: string;
    },
  ) {
    const { memberId, gymId, reason, approverName, notes, deviceUsed } = dto;

    const gym = await this.prisma.gym.findFirst({
      where: { id: gymId, organizationId: orgId },
    });
    if (!gym) {
      throw new NotFoundException('Branch location not found');
    }

    if ((gym.settings as any)?.allowManualOverride === false) {
      throw new BadRequestException('Manual override is disabled in Attendance Settings for this branch.');
    }

    const member = await this.prisma.member.findFirst({
      where: { id: memberId, organizationId: orgId },
    });
    if (!member) {
      throw new NotFoundException('Member profile not found');
    }

    // Create a manual override check-in record
    const attendance = await this.prisma.attendance.create({
      data: {
        organizationId: orgId,
        gymId,
        memberId,
        memberName: `${member.firstName} ${member.lastName}`,
        method: 'Manual Override',
        status: 'Granted',
        recordedBy: approverName,
        deviceUsed: deviceUsed || 'Reception Desk',
        reason: `Override Reason: ${reason}. Notes: ${notes || 'None'}`,
      },
    });

    // Create Audit Log
    await this.auditLogsService.logEvent({
      organizationId: orgId,
      action: 'Manual Override Check-In Approved',
      user: approverName,
      details: `Approved check-in override for ${member.firstName} ${member.lastName}. Reason: ${reason}. Notes: ${notes || 'None'}`,
      eventType: 'ATTENDANCE_OVERRIDE_APPROVED',
      eventCategory: 'Attendance',
      entityType: 'Attendance',
      entityId: attendance.id,
    });

    return {
      success: true,
      attendance,
    };
  }

  async validateCheckIn(
    orgId: string,
    gymId: string,
    memberId: string,
  ) {
    const gym = await this.prisma.gym.findFirst({
      where: { id: gymId, organizationId: orgId },
    });
    if (!gym) {
      throw new NotFoundException('Branch location not found');
    }

    const member = await this.prisma.member.findFirst({
      where: { id: memberId, organizationId: orgId },
      include: {
        memberMemberships: {
          include: {
            membershipPlan: true,
          },
        },
      },
    });

    if (!member) {
      return {
        success: false,
        status: 'Denied',
        reason: 'Member profile not found',
        layers: [
          { name: 'Member Validation', status: 'Failed', message: 'Member profile not found' },
          { name: 'Membership Validation', status: 'Skipped', message: 'No profile' },
          { name: 'Branch Access Validation', status: 'Skipped', message: 'No profile' },
          { name: 'Attendance Rules Validation', status: 'Skipped', message: 'No profile' },
          { name: 'Financial Validation', status: 'Skipped', message: 'No profile' },
          { name: 'Capacity Validation', status: 'Skipped', message: 'No profile' },
        ],
      };
    }

    const settings = (gym.settings as any) || {};
    const blockExpired = settings.blockExpired !== false && settings.validateExpiry !== false;
    const blockFrozen = settings.blockFrozen !== false && settings.validateFreeze !== false;
    const allowGracePeriod = !!settings.allowGracePeriod || (settings.gracePeriod > 0);
    const gracePeriodDays = Number(settings.gracePeriodDays) || 0;
    const outstandingBalanceRule = settings.financialValidation || settings.outstandingBalanceRule || 'warn'; // ignore | warn | block
    const maxOccupancyPercent = Number(settings.maxOccupancyPercent) || 100;
    const duplicateScanPrevention = settings.duplicateScanPrevention !== false;

    const earliestCheckIn = settings.earliestCheckIn;
    const latestCheckIn = settings.latestCheckIn;
    const maxDailyCheckIns = Number(settings.maxDailyCheckIns) || 0;
    const duplicatePrevention = settings.duplicatePrevention !== false;
    const minGap = Number(settings.minGap) || 30;
    const validateStatus = settings.validateStatus !== false;
    const validateSuspension = settings.validateSuspension !== false;
    const validateBranchAccess = settings.validateBranchAccess !== false;
    const validateVisitLimits = settings.validateVisitLimits !== false;

    const layers: any[] = [];
    let finalDecision: 'Granted' | 'Denied' | 'Warning' = 'Granted';
    let finalReason = '';

    // Layer 1: Member Validation
    const isSuspended = (member as any).status === 'Suspended';
    const isDeleted = member.deletedAt !== null;
    
    if (isDeleted && validateStatus) {
      layers.push({
        name: 'Member Validation',
        status: 'Failed',
        message: 'Member has been deleted/deactivated.',
      });
      finalDecision = 'Denied';
      finalReason = finalReason || 'Member Deleted';
    } else if (isSuspended && validateSuspension) {
      layers.push({
        name: 'Member Validation',
        status: 'Failed',
        message: 'Member profile is currently Suspended.',
      });
      finalDecision = 'Denied';
      finalReason = finalReason || 'Member Suspended';
    } else {
      layers.push({
        name: 'Member Validation',
        status: 'Passed',
        message: (isDeleted || isSuspended) ? 'Member status checks disabled in Attendance Settings.' : 'Member exists and is active.',
      });
    }

    // Layer 2: Membership Validation
    let activeSub: any = null;
    if (finalDecision !== 'Denied') {
      const subscriptions = member.memberMemberships || [];
      const now = new Date();
      
      const activeOrRecent = subscriptions.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
      const currentSub = activeOrRecent[0];

      if (!currentSub) {
        layers.push({
          name: 'Membership Validation',
          status: 'Failed',
          message: 'No membership plan found on record.',
        });
        finalDecision = 'Denied';
        finalReason = finalReason || 'No Membership Plan Found';
      } else {
        const endDate = new Date(currentSub.endDate);
        const startDate = new Date(currentSub.startDate);
        const isExpired = endDate < now;
        const isNotStarted = startDate > now;
        const subStatus = currentSub.status;

        if (subStatus === 'Frozen' && blockFrozen) {
          layers.push({
            name: 'Membership Validation',
            status: 'Failed',
            message: 'Membership status is Frozen.',
            data: { status: subStatus, endDate },
          });
          finalDecision = 'Denied';
          finalReason = finalReason || 'Membership Frozen';
        } else if (subStatus === 'Cancelled') {
          layers.push({
            name: 'Membership Validation',
            status: 'Failed',
            message: 'Membership has been Cancelled.',
            data: { status: subStatus, endDate },
          });
          finalDecision = 'Denied';
          finalReason = finalReason || 'Membership Cancelled';
        } else if (isNotStarted) {
          layers.push({
            name: 'Membership Validation',
            status: 'Failed',
            message: `Membership start date is in future: ${startDate.toISOString().split('T')[0]}`,
            data: { status: subStatus, startDate },
          });
          finalDecision = 'Denied';
          finalReason = finalReason || 'Membership Not Started';
        } else if (isExpired) {
          const diffTime = Math.abs(now.getTime() - endDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (allowGracePeriod && diffDays <= gracePeriodDays) {
            layers.push({
              name: 'Membership Validation',
              status: 'Warning',
              message: `Membership expired on ${endDate.toISOString().split('T')[0]}, but within grace period of ${gracePeriodDays} days.`,
              data: { status: subStatus, endDate, diffDays, gracePeriodDays },
            });
            finalDecision = 'Warning';
            finalReason = finalReason || 'Grace Period Active';
            activeSub = currentSub;
          } else if (blockExpired) {
            layers.push({
              name: 'Membership Validation',
              status: 'Failed',
              message: `Membership expired on ${endDate.toISOString().split('T')[0]} (${diffDays} days ago).`,
              data: { status: subStatus, endDate, diffDays },
            });
            finalDecision = 'Denied';
            finalReason = finalReason || 'Membership Expired';
          } else {
            layers.push({
              name: 'Membership Validation',
              status: 'Warning',
              message: `Membership expired on ${endDate.toISOString().split('T')[0]} but expiration blocking is disabled.`,
              data: { status: subStatus, endDate },
            });
            finalDecision = 'Warning';
            finalReason = finalReason || 'Membership Expired (No Block)';
            activeSub = currentSub;
          }
        } else {
          layers.push({
            name: 'Membership Validation',
            status: 'Passed',
            message: `Active membership: ${currentSub.membershipPlan.name} (Expires ${endDate.toISOString().split('T')[0]})`,
            data: { status: subStatus, endDate },
          });
          activeSub = currentSub;
        }
      }
    } else {
      layers.push({
        name: 'Membership Validation',
        status: 'Skipped',
        message: 'Skipped due to previous validation failure.',
      });
    }

    // Layer 3: Branch Access Validation
    if (finalDecision !== 'Denied' && activeSub && !validateBranchAccess) {
      layers.push({
        name: 'Branch Access Validation',
        status: 'Skipped',
        message: 'Branch access validation disabled in Attendance Settings.',
      });
    } else if (finalDecision !== 'Denied' && activeSub) {
      const plan = activeSub.membershipPlan;
      const allowedBranchList = plan.branchAccess === 'all'
        ? 'all'
        : plan.branchAccess.split(',').map((id) => id.trim());

      const isBranchAllowed = allowedBranchList === 'all' || allowedBranchList.includes(gymId);

      if (!isBranchAllowed) {
        layers.push({
          name: 'Branch Access Validation',
          status: 'Failed',
          message: `Branch not authorized. Membership plan is restricted to: ${plan.branchAccess}. Current branch: ${gym.name}`,
          data: { allowed: plan.branchAccess, current: gym.name },
        });
        finalDecision = 'Denied';
        finalReason = finalReason || 'Branch Not Authorized';
      } else {
        layers.push({
          name: 'Branch Access Validation',
          status: 'Passed',
          message: `Branch authorized. Access Type: ${plan.branchAccess === 'all' ? 'All Branches' : 'Authorized Branches'}.`,
        });
      }
    } else {
      layers.push({
        name: 'Branch Access Validation',
        status: 'Skipped',
        message: 'Skipped due to previous validation failure.',
      });
    }

    // Layer 4: Attendance Rules Validation
    if (finalDecision !== 'Denied' && activeSub) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const activeSession = await this.prisma.attendance.findFirst({
        where: {
          organizationId: orgId,
          memberId,
          status: 'Granted',
          checkOutTime: null,
          checkInTime: { gte: todayStart },
        },
      });

      if (activeSession && duplicateScanPrevention) {
        layers.push({
          name: 'Attendance Rules Validation',
          status: 'Failed',
          message: 'Already checked in today. Active session detected.',
        });
        finalDecision = 'Denied';
        finalReason = finalReason || 'Duplicate Check-In';
      } else {

        // Check Daily Limits
        if (maxDailyCheckIns > 0) {
          const dailyVisits = await this.prisma.attendance.count({
            where: {
              organizationId: orgId,
              memberId,
              status: 'Granted',
              checkInTime: { gte: todayStart },
            },
          });
          if (dailyVisits >= maxDailyCheckIns) {
            layers.push({
              name: 'Attendance Rules Validation',
              status: 'Failed',
              message: `Daily check-in limit reached: ${dailyVisits}/${maxDailyCheckIns} check-ins.`,
            });
            finalDecision = 'Denied';
            finalReason = finalReason || 'Daily Limit Reached';
          }
        }

        // Check Earliest / Latest
        if (finalDecision !== 'Denied' && (earliestCheckIn || latestCheckIn)) {
          const now = new Date();
          const currMins = now.getHours() * 60 + now.getMinutes();
          if (earliestCheckIn) {
            const [eh, em] = earliestCheckIn.split(':').map(Number);
            if (currMins < eh * 60 + em) {
              layers.push({
                name: 'Attendance Rules Validation',
                status: 'Failed',
                message: `Check-in denied. Too early. Allowed from ${earliestCheckIn}.`,
              });
              finalDecision = 'Denied';
              finalReason = finalReason || 'Outside Allowed Hours';
            }
          }
          if (latestCheckIn && finalDecision !== 'Denied') {
            const [lh, lm] = latestCheckIn.split(':').map(Number);
            if (currMins > lh * 60 + lm) {
              layers.push({
                name: 'Attendance Rules Validation',
                status: 'Failed',
                message: `Check-in denied. Too late. Allowed until ${latestCheckIn}.`,
              });
              finalDecision = 'Denied';
              finalReason = finalReason || 'Outside Allowed Hours';
            }
          }
        }

        // Duplicate Scan Gap check
        if (finalDecision !== 'Denied' && duplicatePrevention && minGap > 0) {
          const lastVisit = await this.prisma.attendance.findFirst({
            where: {
              organizationId: orgId,
              memberId,
            },
            orderBy: { checkInTime: 'desc' }
          });
          if (lastVisit) {
            const diffMins = (Date.now() - lastVisit.checkInTime.getTime()) / 60000;
            if (diffMins < minGap) {
              layers.push({
                name: 'Attendance Rules Validation',
                status: 'Failed',
                message: `Duplicate scan detected. Minimum gap required is ${minGap} minutes.`,
              });
              finalDecision = 'Denied';
              finalReason = finalReason || 'Duplicate Scan';
            }
          }
        }

        if (!validateVisitLimits) {
          layers.push({
            name: 'Attendance Rules Validation',
            status: 'Passed',
            message: 'Plan visit limit validation disabled in Attendance Settings.',
          });
        } else {
          const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

          const monthlyVisits = await this.prisma.attendance.count({
            where: {
              organizationId: orgId,
              memberId,
              status: 'Granted',
              checkInTime: { gte: monthStart },
            },
          });

          const plan = activeSub.membershipPlan;
          let limit = 9999;
          if (plan.name.toLowerCase().includes('10 visits') || (plan.benefits as any)?.visitLimit === 10) {
            limit = 10;
          } else if (plan.name.toLowerCase().includes('limited') || plan.name.toLowerCase().includes('lite')) {
            limit = 12;
          } else if (plan.name.toLowerCase().includes('30 visits') || (plan.benefits as any)?.visitLimit === 30) {
            limit = 30;
          }

          if (monthlyVisits >= limit) {
            layers.push({
              name: 'Attendance Rules Validation',
              status: 'Failed',
              message: `Monthly visit limit reached: ${monthlyVisits}/${limit} visits used.`,
              data: { monthlyVisits, limit },
            });
            finalDecision = 'Denied';
            finalReason = finalReason || 'Visit Limit Reached';
          } else if (limit < 9999 && (limit - monthlyVisits) <= 2) {
            layers.push({
              name: 'Attendance Rules Validation',
              status: 'Warning',
              message: `Low visit balance: ${limit - monthlyVisits} visits remaining this month.`,
              data: { monthlyVisits, limit },
            });
            finalDecision = 'Warning';
            finalReason = finalReason || 'Low Visit Balance';
          } else {
            layers.push({
              name: 'Attendance Rules Validation',
              status: 'Passed',
              message: `Attendance rules satisfied. Monthly visits: ${monthlyVisits}/${limit === 9999 ? 'Unlimited' : limit}.`,
            });
          }
        }
      }
    } else {
      layers.push({
        name: 'Attendance Rules Validation',
        status: 'Skipped',
        message: 'Skipped due to previous validation failure.',
      });
    }

    // Layer 5: Financial Validation
    if (finalDecision !== 'Denied') {
      let outstandingBalance = activeSub?.outstandingDues || 0;
      if (!outstandingBalance && (member.firstName.startsWith('Jane') || member.firstName.startsWith('A'))) {
        outstandingBalance = 500;
      }

      if (outstandingBalance > 0 && activeSub?.outstandingDues > 0) {
        // Real outstanding dues on the active membership always block check-in,
        // regardless of branch financial validation policy.
        layers.push({
          name: 'Dues Validation',
          status: 'Failed',
          message: `Outstanding dues of $${outstandingBalance.toFixed(2)} must be cleared before check-in.`,
          data: { outstandingDues: outstandingBalance },
        });
        finalDecision = 'Denied';
        finalReason = finalReason || 'Outstanding Dues';
      }

      if (finalDecision === 'Denied' && finalReason === 'Outstanding Dues') {
        // Skip the legacy mock financial check entirely once real dues already failed.
        layers.push({
          name: 'Financial Validation',
          status: 'Skipped',
          message: 'Skipped due to outstanding dues failure.',
        });
      } else if (outstandingBalance > 0) {
        if (outstandingBalanceRule === 'block') {
          layers.push({
            name: 'Financial Validation',
            status: 'Failed',
            message: `Access Denied: Outstanding balance of ₹${outstandingBalance}. Policy: Block Entry.`,
            data: { outstandingBalance, rule: outstandingBalanceRule },
          });
          finalDecision = 'Denied';
          finalReason = finalReason || 'Outstanding Balance Violation';
        } else if (outstandingBalanceRule === 'warn') {
          layers.push({
            name: 'Financial Validation',
            status: 'Warning',
            message: `Outstanding balance detected: ₹${outstandingBalance}. Policy: Warn Only.`,
            data: { outstandingBalance, rule: outstandingBalanceRule },
          });
          finalDecision = 'Warning';
          finalReason = finalReason || 'Outstanding Balance';
        } else {
          layers.push({
            name: 'Financial Validation',
            status: 'Passed',
            message: `Outstanding balance of ₹${outstandingBalance} ignored by branch policy.`,
            data: { outstandingBalance, rule: outstandingBalanceRule },
          });
        }
      } else {
        layers.push({
          name: 'Financial Validation',
          status: 'Passed',
          message: 'No outstanding balances or overdue invoices.',
        });
      }
    } else {
      layers.push({
        name: 'Financial Validation',
        status: 'Skipped',
        message: 'Skipped due to previous validation failure.',
      });
    }

    // Layer 6: Capacity Validation
    if (finalDecision !== 'Denied') {
      const currentOccupancy = await this.prisma.attendance.count({
        where: {
          organizationId: orgId,
          gymId,
          status: 'Granted',
          checkOutTime: null,
        },
      });

      const maxCapacity = gym.capacity > 0 ? gym.capacity : (Number(settings.capacity) || 150);
      const maxAllowed = Math.round((maxCapacity * maxOccupancyPercent) / 100);

      if (gym.capacity > 0 && currentOccupancy >= gym.capacity) {
        layers.push({
          name: 'Capacity Validation',
          status: 'Failed',
          message: `Branch is at maximum occupancy (${currentOccupancy}/${gym.capacity}).`,
          data: { currentOccupancy, maxCapacity: gym.capacity },
        });
        finalDecision = 'Denied';
        finalReason = finalReason || 'Branch Capacity Exceeded';
      } else if (currentOccupancy >= maxAllowed) {
        layers.push({
          name: 'Capacity Validation',
          status: 'Failed',
          message: `Branch capacity limit exceeded. Occupancy: ${currentOccupancy}/${maxCapacity} (${Math.round((currentOccupancy / maxCapacity) * 100)}%). Max Allowed occupancy threshold is ${maxOccupancyPercent}%.`,
          data: { currentOccupancy, maxCapacity, maxOccupancyPercent, maxAllowed },
        });
        finalDecision = 'Denied';
        finalReason = finalReason || 'Branch Capacity Exceeded';
      } else {
        layers.push({
          name: 'Capacity Validation',
          status: 'Passed',
          message: `Occupancy check passed: ${currentOccupancy}/${maxCapacity} active check-ins.`,
          data: { currentOccupancy, maxCapacity },
        });
      }
    } else {
      layers.push({
        name: 'Capacity Validation',
        status: 'Skipped',
        message: 'Skipped due to previous validation failure.',
      });
    }

    return {
      success: finalDecision !== 'Denied',
      status: finalDecision,
      reason: finalReason,
      layers,
      member: {
        id: member.id,
        name: `${member.firstName} ${member.lastName}`,
        phone: member.phoneNumber,
        status: activeSub ? activeSub.status : 'N/A',
        planName: activeSub ? activeSub.membershipPlan.name : 'N/A',
        expiryDate: activeSub ? new Date(activeSub.endDate).toISOString().split('T')[0] : 'N/A',
        remainingVisits: 8,
      },
    };
  }
}
