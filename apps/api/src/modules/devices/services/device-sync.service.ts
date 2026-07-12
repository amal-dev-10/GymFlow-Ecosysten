import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { Device } from '@gym/database';

@Injectable()
export class DeviceSyncService {
  private readonly logger = new Logger(DeviceSyncService.name);

  constructor(private prisma: DatabaseService) {}

  async syncMembers(device: Device, payload: any) {
    this.logger.log(`Syncing members for device ${device.id}`);
    
    // Auto-map all org members to this device for MVP/Simulator purposes
    const allMembers = await this.prisma.member.findMany({
      where: { organizationId: device.organizationId }
    });

    for (let i = 0; i < allMembers.length; i++) {
      const member = allMembers[i];
      const existing = await this.prisma.deviceUserMapping.findUnique({
        where: {
          deviceId_memberId: {
            deviceId: device.id,
            memberId: member.id
          }
        }
      });
      
      if (!existing) {
        await this.prisma.deviceUserMapping.create({
          data: {
            deviceId: device.id,
            memberId: member.id,
            externalUserId: String(1000 + i), // Mock external ID
          }
        });
      }
    }
    
    const membersToSync = await this.prisma.deviceUserMapping.findMany({
      where: { deviceId: device.id },
      include: { member: true }
    });

    return {
      success: true,
      count: membersToSync.length,
      data: membersToSync.map(m => ({
        externalUserId: m.externalUserId,
        name: `${m.member.firstName} ${m.member.lastName}`,
        fingerprintId: m.fingerprintId,
        cardId: m.cardId
      }))
    };
  }
}
