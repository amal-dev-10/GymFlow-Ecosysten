import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { Device, DeviceEventStatus } from '@gym/database';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { AttendanceService } from '../../attendance/attendance.service';

@Injectable()
export class DeviceEventProcessorService {
  private readonly logger = new Logger(DeviceEventProcessorService.name);

  constructor(
    private prisma: DatabaseService,
    private realtimeGateway: RealtimeGateway,
    private attendanceService: AttendanceService,
  ) {}

  async processEvent(device: Device, payload: any) {
    this.logger.log(`Processing event for device ${device.id}`);
    
    // 1. Store raw event
    const event = await this.prisma.deviceEvent.create({
      data: {
        deviceId: device.id,
        type: payload.type || 'UNKNOWN',
        rawPayload: payload,
        status: DeviceEventStatus.PENDING,
      },
    });

    try {
      // 2. Delegate to appropriate adapter based on device.vendor
      // For now, we will handle a generic flow
      if (payload.type === 'CHECK_IN') {
        await this.handleCheckIn(device, payload);
      }

      // 3. Mark processed
      await this.prisma.deviceEvent.update({
        where: { id: event.id },
        data: {
          status: DeviceEventStatus.PROCESSED,
          processedAt: new Date(),
        },
      });

      return { success: true, eventId: event.id };
    } catch (error) {
      this.logger.error(`Failed to process event ${event.id}:`, error);
      await this.prisma.deviceEvent.update({
        where: { id: event.id },
        data: {
          status: DeviceEventStatus.FAILED,
          processedAt: new Date(),
        },
      });
      throw error;
    }
  }

  private async handleCheckIn(device: Device, payload: any) {
    const externalUserId = String(payload.userId ?? payload.user_id ?? '').trim();
    const method = (payload.method || 'BIOMETRIC').toString();

    const mapping = externalUserId
      ? await this.prisma.deviceUserMapping.findUnique({
          where: {
            deviceId_externalUserId: {
              deviceId: device.id,
              externalUserId,
            },
          },
          include: { member: true },
        })
      : null;

    if (!mapping) {
      this.logger.warn(`No user mapping found for external ID ${externalUserId || '(none)'} on device ${device.id}`);
      // Log the attempt instead of silently dropping it, so an unrecognized
      // scan shows up as a denied entry in the terminal history rather than
      // vanishing with no trace.
      await this.recordDeviceDenial(device, method, `Unrecognized device user (ID: ${externalUserId || 'unknown'})`);
      return;
    }

    // The device itself can report that the scan/verification failed (e.g. a
    // fingerprint read that didn't match) before identity is even confirmed.
    // That must be recorded as Denied directly - routing it through the
    // membership check-in flow below would ignore the device's own rejection
    // and could grant access based on membership status alone.
    if (payload.status === 'FAILED') {
      await this.recordDeviceDenial(
        device,
        method,
        'Biometric verification failed',
        mapping.memberId,
        `${mapping.member.firstName} ${mapping.member.lastName}`,
      );
      return;
    }

    // Scan succeeded and the member is known - route through the SAME
    // check-in path the terminal/mobile app use, so membership/freeze/
    // capacity rules are enforced and occupancy, stats, realtime events, and
    // audit logs all stay in sync. This used to write a raw status:
    // 'COMPLETED' Attendance row that no other part of the app recognizes
    // (getStats/listActive only match 'Granted'/'Denied'), so device
    // check-ins never counted toward "currently inside" and the terminal's
    // Granted/Denied-only rendering mislabeled them as "Denied: null".
    await this.attendanceService.checkIn(device.organizationId, {
      memberId: mapping.memberId,
      gymId: device.gymId,
      method,
      deviceUsed: device.name,
    });
    this.logger.log(`Attendance recorded for member ${mapping.memberId}`);
  }

  private async recordDeviceDenial(
    device: Device,
    method: string,
    reason: string,
    memberId?: string,
    memberName?: string,
  ) {
    const attendance = await this.prisma.attendance.create({
      data: {
        organizationId: device.organizationId,
        gymId: device.gymId,
        memberId,
        memberName: memberName || 'Unrecognized Device Scan',
        method,
        status: 'Denied',
        reason,
        deviceUsed: device.name,
      },
    });
    this.realtimeGateway.emitValidation(device.gymId, { memberId, memberName: attendance.memberName, status: 'Denied', reason });
    return attendance;
  }
}
