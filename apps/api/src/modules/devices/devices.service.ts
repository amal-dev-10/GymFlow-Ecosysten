import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { DeviceType, DeviceStatus, DeviceVendor, Device } from '@gym/database';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { DeviceEventProcessorService } from './services/device-event-processor.service';
import { DeviceSyncService } from './services/device-sync.service';
import { randomBytes } from 'crypto';

@Injectable()
export class DevicesService {
  constructor(
    private prisma: DatabaseService,
    private realtimeGateway: RealtimeGateway,
    private eventProcessor: DeviceEventProcessorService,
    private syncService: DeviceSyncService,
  ) {}

  private getWebhookUrl(): string {
    const isDev = process.env.NODE_ENV !== 'production';
    const apiUrl = process.env.API_URL || (isDev ? `http://localhost:${process.env.PORT || 5000}` : 'https://api.gymflow.com');
    return `${apiUrl}/v1/devices`;
  }

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
      vendor: device.vendor,
      model: device.model,
      serialNumber: device.serialNumber,
      ipAddress: device.ipAddress,
      status: device.status,
      lastHeartbeat: device.lastHeartbeat,
      lastSeen: device.lastSeen,
      lastSync: device.lastSync,
      version: device.version,
      deviceKey: device.deviceKey, // Sent back so admins can configure the device
      gymId: device.gymId,
      gymName: device.gym?.name,
      createdAt: device.createdAt,
      updatedAt: device.updatedAt,
    }));
  }

  /**
   * Create/register a new device.
   */
  async createDevice(
    orgId: string, 
    dto: { 
      name: string; 
      type: DeviceType; 
      gymId: string;
      vendor?: DeviceVendor;
      model?: string;
      serialNumber?: string;
      ipAddress?: string;
      description?: string;
    }
  ) {
    const { name, type, gymId, vendor, model, serialNumber, ipAddress, description } = dto;

    if (!name || !type || !gymId) {
      throw new BadRequestException('name, type, and gymId are required');
    }

    const gym = await this.prisma.gym.findFirst({
      where: { id: gymId, organizationId: orgId },
    });
    if (!gym) {
      throw new NotFoundException('Branch location not found');
    }

    // Generate a secure 32-character device key
    const deviceKey = randomBytes(16).toString('hex');
    const webhookUrl = this.getWebhookUrl();

    const device = await this.prisma.device.create({
      data: {
        organizationId: orgId,
        gymId,
        name,
        description,
        type,
        vendor: vendor || DeviceVendor.CUSTOM,
        model,
        serialNumber,
        ipAddress,
        deviceKey,
        webhookUrl,
        configuration: {
          heartbeatInterval: 60,
          timezone: 'UTC',
          autoSync: true,
          eventSync: true,
        },
        health: {
          cpu: '0%',
          memory: '0%',
          storage: '0%',
          network: '0%',
          temperature: '0C',
        },
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
    dto: { 
      status?: DeviceStatus; 
      version?: string; 
      name?: string;
      vendor?: DeviceVendor;
      model?: string;
      serialNumber?: string;
      ipAddress?: string;
      description?: string;
      configuration?: any;
    },
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
        ...(dto.vendor !== undefined ? { vendor: dto.vendor } : {}),
        ...(dto.model !== undefined ? { model: dto.model } : {}),
        ...(dto.serialNumber !== undefined ? { serialNumber: dto.serialNumber } : {}),
        ...(dto.ipAddress !== undefined ? { ipAddress: dto.ipAddress } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.configuration !== undefined ? { configuration: dto.configuration } : {}),
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

  // ==========================================
  // DASHBOARD EXTENDED METHODS
  // ==========================================

  async getDevice(orgId: string, id: string) {
    const device = await this.prisma.device.findFirst({
      where: { id, organizationId: orgId },
      include: { gym: true },
    });
    if (!device) throw new NotFoundException('Device not found');
    
    // Override webhookUrl for current environment
    device.webhookUrl = this.getWebhookUrl();
    
    return device;
  }

  async getDeviceEvents(orgId: string, id: string) {
    // Basic org isolation check
    await this.getDevice(orgId, id);

    return this.prisma.deviceEvent.findMany({
      where: { deviceId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getDeviceMembers(orgId: string, id: string) {
    await this.getDevice(orgId, id);

    const mappings = await this.prisma.deviceUserMapping.findMany({
      where: { deviceId: id },
      include: {
        member: { select: { id: true, firstName: true, lastName: true, phoneNumber: true } }
      }
    });

    return mappings.map(m => ({
      mappingId: m.id,
      memberId: m.memberId,
      name: `${m.member.firstName} ${m.member.lastName}`,
      email: m.member.phoneNumber,
      externalUserId: m.externalUserId,
      fingerprintId: m.fingerprintId,
      cardId: m.cardId,
      faceId: m.faceId,
    }));
  }

  async triggerSync(orgId: string, id: string) {
    const device = await this.getDevice(orgId, id);
    
    // In reality, this might send an MQTT message or flag the device for sync
    // For now, update the status to SYNCING
    const updated = await this.prisma.device.update({
      where: { id: device.id },
      data: {
        status: DeviceStatus.ONLINE, // Reset to ONLINE eventually, but SYNCING in real flow
        lastSync: new Date(),
      }
    });
    this.realtimeGateway.emitDeviceStatus(updated.gymId, updated);
    
    return { success: true, message: 'Sync triggered' };
  }

  async testConnection(orgId: string, id: string) {
    const device = await this.getDevice(orgId, id);
    
    // Simulate a ping or checking last heartbeat
    const isOnline = device.lastHeartbeat && (Date.now() - device.lastHeartbeat.getTime() < 300000); // 5 mins
    
    return { 
      success: true, 
      status: isOnline ? 'ONLINE' : 'OFFLINE',
      ping: isOnline ? Math.floor(Math.random() * 50) + 10 : null
    };
  }

  // ==========================================
  // DEVICE GATEWAY METHODS
  // ==========================================

  async deviceHeartbeat(device: Device, dto: { version?: string; ipAddress?: string }) {
    const now = new Date();
    const updated = await this.prisma.device.update({
      where: { id: device.id },
      data: {
        status: DeviceStatus.ONLINE,
        lastHeartbeat: now,
        lastSeen: now,
        ...(dto.version !== undefined ? { version: dto.version, lastSync: now } : {}),
        ...(dto.ipAddress !== undefined ? { ipAddress: dto.ipAddress } : {}),
      },
    });

    this.realtimeGateway.emitDeviceStatus(updated.gymId, updated);

    return {
      success: true,
      timestamp: now,
    };
  }

  async processEvents(device: Device, payload: any) {
    return this.eventProcessor.processEvent(device, payload);
  }

  async syncMembers(device: Device, payload: any) {
    return this.syncService.syncMembers(device, payload);
  }

  // Old dashboard heartbeat (kept for backwards compatibility if needed, though we could drop it)
  async heartbeat(orgId: string, id: string, dto: { version?: string }) {
    const device = await this.prisma.device.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!device) {
      throw new NotFoundException('Device not found');
    }
    return this.deviceHeartbeat(device, dto);
  }
}
