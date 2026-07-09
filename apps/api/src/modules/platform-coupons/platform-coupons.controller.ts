import { Controller, Get, Post, Put, Delete, Param, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { PlatformCouponsService } from './platform-coupons.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../platform-plans/guards/platform-admin.guard';
import { RequirePlatformRoles } from '../platform-plans/decorators/require-platform-roles.decorator';
import { CreateCouponDto, UpdateCouponDto } from './dto/coupon.dto';

@Controller('v1/platform/coupons')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformCouponsController {
  constructor(private readonly service: PlatformCouponsService) {}

  @Get('stats')
  getStats() {
    return this.service.getStats();
  }

  @Get()
  list() {
    return this.service.list();
  }

  @RequirePlatformRoles('SUPER_ADMIN', 'FINANCE')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req, @Body() dto: CreateCouponDto) {
    return this.service.create(dto, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN', 'FINANCE')
  @Put(':id')
  update(@Param('id') id: string, @Req() req, @Body() dto: UpdateCouponDto) {
    return this.service.update(id, dto, req.user.userId);
  }

  @RequirePlatformRoles('SUPER_ADMIN', 'FINANCE')
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.service.remove(id, req.user.userId);
  }
}
