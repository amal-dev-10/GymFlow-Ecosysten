import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { Device } from '@gym/database';

@Injectable()
export class DeviceSyncService {
  private readonly logger = new Logger(DeviceSyncService.name);

  constructor(private prisma: DatabaseService) {}

  async syncMembers(device: Device, payload: any) {
    this.logger.log(`Syncing members for device ${device.id}`);
    
    // In a real implementation, this would trigger a job to push members to the device
    // Or return a list of members that the device should pull down
    
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
