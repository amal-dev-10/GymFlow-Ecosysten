import { Controller, Post, Get, Patch, Delete, Body, Req, UseGuards, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { TenantGuard } from '../../core/guards/tenant.guard';
import { PermissionsGuard } from '../../core/guards/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import { DeviceType, DeviceStatus } from '@gym/database';

@Controller('v1/devices')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @RequirePermissions({ resource: 'devices', action: 'view' })
  @Get()
  @HttpCode(HttpStatus.OK)
  listDevices(@Req() req, @Query('gymId') gymId?: string) {
    return this.devicesService.listDevices(req.organizationId, gymId);
  }

  @RequirePermissions({ resource: 'devices', action: 'manage' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createDevice(
    @Req() req,
    @Body() dto: { name: string; type: DeviceType; gymId: string },
  ) {
    return this.devicesService.createDevice(req.organizationId, dto);
  }

  @RequirePermissions({ resource: 'devices', action: 'manage' })
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  updateDevice(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: { status?: DeviceStatus; version?: string; name?: string },
  ) {
    return this.devicesService.updateDevice(req.organizationId, id, dto);
  }

  @RequirePermissions({ resource: 'devices', action: 'manage' })
  @Post(':id/heartbeat')
  @HttpCode(HttpStatus.OK)
  heartbeat(@Req() req, @Param('id') id: string, @Body() dto: { version?: string }) {
    return this.devicesService.heartbeat(req.organizationId, id, dto);
  }

  @RequirePermissions({ resource: 'devices', action: 'manage' })
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  deleteDevice(@Req() req, @Param('id') id: string) {
    return this.devicesService.deleteDevice(req.organizationId, id);
  }
}
