import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { Request } from 'express';

@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(private prisma: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    
    // Support either header or body for deviceKey (some devices only support body params)
    const deviceKeyHeader = request.headers['x-device-key'];
    let deviceKey = Array.isArray(deviceKeyHeader) ? deviceKeyHeader[0] : deviceKeyHeader;
    
    if (!deviceKey && request.body && typeof request.body === 'object' && 'deviceKey' in request.body) {
      deviceKey = (request.body as any).deviceKey;
    }

    if (!deviceKey) {
      throw new UnauthorizedException('Missing X-Device-Key or deviceKey payload');
    }

    const device = await this.prisma.device.findUnique({
      where: { deviceKey: String(deviceKey) }
    });

    if (!device) {
      throw new UnauthorizedException('Invalid device key');
    }

    // Inject device context into request
    request['device'] = device;
    request['organizationId'] = device.organizationId;
    request['gymId'] = device.gymId;

    return true;
  }
}
