import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { Device, DeviceEventStatus } from '@gym/database';

@Injectable()
export class DeviceEventProcessorService {
  private readonly logger = new Logger(DeviceEventProcessorService.name);

  constructor(private prisma: DatabaseService) {}

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
    // Find member mapping
    const mapping = await this.prisma.deviceUserMapping.findUnique({
      where: {
        deviceId_externalUserId: {
          deviceId: device.id,
          externalUserId: String(payload.userId || payload.user_id),
        },
      },
      include: { member: true },
    });

    if (!mapping) {
      this.logger.warn(`No user mapping found for external ID ${payload.userId} on device ${device.id}`);
      return;
    }

    // Call Attendance Service logic (Simplified for this module)
    await this.prisma.attendance.create({
      data: {
        memberId: mapping.memberId,
        gymId: device.gymId,
        organizationId: device.organizationId,
        method: 'BIOMETRIC', // Assuming it's a biometric device
        checkInTime: new Date(payload.timestamp || Date.now()),
        status: 'COMPLETED',
      },
    });
    this.logger.log(`Attendance recorded for member ${mapping.memberId}`);
  }
}
