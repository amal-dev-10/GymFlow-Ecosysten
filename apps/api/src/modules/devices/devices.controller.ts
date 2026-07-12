import { Controller, Post, Get, Patch, Delete, Body, Req, UseGuards, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { TenantGuard } from '../../core/guards/tenant.guard';
import { PermissionsGuard } from '../../core/guards/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import { DeviceType, DeviceStatus, DeviceVendor } from '@gym/database';
import { DeviceAuthGuard } from './guards/device-auth.guard';

@Controller('v1/devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  // ==========================================
  // DASHBOARD ENDPOINTS (Require JWT)
  // ==========================================

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions({ resource: 'devices', action: 'view' })
  @Get()
  @HttpCode(HttpStatus.OK)
  listDevices(@Req() req, @Query('gymId') gymId?: string) {
    return this.devicesService.listDevices(req.organizationId, gymId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions({ resource: 'devices', action: 'manage' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createDevice(
    @Req() req,
    @Body() dto: { 
      name: string; 
      type: DeviceType; 
      gymId: string;
      vendor?: DeviceVendor;
      model?: string;
      serialNumber?: string;
      ipAddress?: string;
    },
  ) {
    return this.devicesService.createDevice(req.organizationId, dto);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions({ resource: 'devices', action: 'manage' })
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  updateDevice(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: { 
      status?: DeviceStatus; 
      version?: string; 
      name?: string;
      vendor?: DeviceVendor;
      model?: string;
      serialNumber?: string;
      ipAddress?: string;
    },
  ) {
    return this.devicesService.updateDevice(req.organizationId, id, dto);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions({ resource: 'devices', action: 'manage' })
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  deleteDevice(@Req() req, @Param('id') id: string) {
    return this.devicesService.deleteDevice(req.organizationId, id);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions({ resource: 'devices', action: 'view' })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  getDevice(@Req() req, @Param('id') id: string) {
    return this.devicesService.getDevice(req.organizationId, id);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions({ resource: 'devices', action: 'view' })
  @Get(':id/events')
  @HttpCode(HttpStatus.OK)
  getDeviceEvents(@Req() req, @Param('id') id: string) {
    return this.devicesService.getDeviceEvents(req.organizationId, id);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions({ resource: 'devices', action: 'view' })
  @Get(':id/members')
  @HttpCode(HttpStatus.OK)
  getDeviceMembers(@Req() req, @Param('id') id: string) {
    return this.devicesService.getDeviceMembers(req.organizationId, id);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions({ resource: 'devices', action: 'manage' })
  @Post(':id/sync-now')
  @HttpCode(HttpStatus.OK)
  syncNow(@Req() req, @Param('id') id: string) {
    return this.devicesService.triggerSync(req.organizationId, id);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions({ resource: 'devices', action: 'manage' })
  @Post(':id/test-connection')
  @HttpCode(HttpStatus.OK)
  testConnection(@Req() req, @Param('id') id: string) {
    return this.devicesService.testConnection(req.organizationId, id);
  }

  // ==========================================
  // DEVICE GATEWAY ENDPOINTS (Require X-Device-Key)
  // ==========================================

  @UseGuards(DeviceAuthGuard)
  @Post('heartbeat')
  @HttpCode(HttpStatus.OK)
  deviceHeartbeat(@Req() req, @Body() dto: { version?: string; ipAddress?: string }) {
    // req.device is injected by DeviceAuthGuard
    return this.devicesService.deviceHeartbeat(req['device'], dto);
  }

  @UseGuards(DeviceAuthGuard)
  @Post('events')
  @HttpCode(HttpStatus.OK)
  async deviceEvents(@Req() req, @Body() payload: any) {
    return this.devicesService.processEvents(req['device'], payload);
  }

  @UseGuards(DeviceAuthGuard)
  @Post('sync-members')
  @HttpCode(HttpStatus.OK)
  syncMembers(@Req() req, @Body() dto: any) {
    return this.devicesService.syncMembers(req['device'], dto);
  }

  @UseGuards(DeviceAuthGuard)
  @Post('test')
  @HttpCode(HttpStatus.OK)
  testDevice(@Req() req) {
    return { success: true, message: 'Device authenticated successfully', deviceId: req['device'].id };
  }
}
