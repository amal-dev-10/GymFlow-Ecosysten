import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { DeviceType, DeviceStatus } from '@gym/database';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class DevicesService {
  constructor(
    private prisma: DatabaseService,
    private realtimeGateway: RealtimeGateway,
  ) {}

  /**
   * List devices for a gym (or org-wide if gymId omitted).
   */
  async listDevices(orgId: string, gymId?: string) {
    const where: any = { organizationId: orgId };
    if (gymId) {
      where.gymId = gymId;
    }

    const devices = await this.prisma.device.findMany({
      where,
      include: { gym: true },
      orderBy: { createdAt: 'desc' },
    });

    return devices.map((device) => ({
      id: device.id,
      name: device.name,
      type: device.type,
      status: device.status,
      lastHeartbeat: device.lastHeartbeat,
      lastSync: device.lastSync,
      version: device.version,
      gymId: device.gymId,
      gymName: device.gym?.name,
      createdAt: device.createdAt,
      updatedAt: device.updatedAt,
    }));
  }

  /**
   * Create/register a new device.
   */
  async createDevice(orgId: string, dto: { name: string; type: DeviceType; gymId: string }) {
    const { name, type, gymId } = dto;

    if (!name || !type || !gymId) {
      throw new BadRequestException('name, type, and gymId are required');
    }

    const gym = await this.prisma.gym.findFirst({
      where: { id: gymId, organizationId: orgId },
    });
    if (!gym) {
      throw new NotFoundException('Branch location not found');
    }

    const device = await this.prisma.device.create({
      data: {
        organizationId: orgId,
        gymId,
        name,
        type,
        status: DeviceStatus.OFFLINE,
      },
    });

    return {
      success: true,
      device,
    };
  }

  /**
   * Update a device's status, version, or name.
   */
  async updateDevice(
    orgId: string,
    id: string,
    dto: { status?: DeviceStatus; version?: string; name?: string },
  ) {
    const device = await this.prisma.device.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const updated = await this.prisma.device.update({
      where: { id },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.version !== undefined ? { version: dto.version } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
      },
    });

    this.realtimeGateway.emitDeviceStatus(updated.gymId, updated);

    return {
      success: true,
      device: updated,
    };
  }

  /**
   * Device heartbeat ping. Marks the device ONLINE and updates lastHeartbeat.
   * Optionally accepts a `version` to update lastSync/version.
   */
  async heartbeat(orgId: string, id: string, dto: { version?: string }) {
    const device = await this.prisma.device.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const now = new Date();
    const updated = await this.prisma.device.update({
      where: { id },
      data: {
        status: DeviceStatus.ONLINE,
        lastHeartbeat: now,
        ...(dto.version !== undefined
          ? { version: dto.version, lastSync: now }
          : {}),
      },
    });

    this.realtimeGateway.emitDeviceStatus(updated.gymId, updated);

    return {
      success: true,
      device: updated,
    };
  }

  /**
   * Remove a device.
   */
  async deleteDevice(orgId: string, id: string) {
    const device = await this.prisma.device.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    await this.prisma.device.delete({ where: { id } });

    return {
      success: true,
    };
  }
}
