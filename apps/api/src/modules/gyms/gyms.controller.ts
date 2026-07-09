import { Controller, Post, Get, Put, Body, Query, Param, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { GymsService } from './gyms.service';
import { CreateGymDto } from './dto/create-gym.dto';
import { UpdateGymDto } from './dto/update-gym.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';

@Controller('v1/gyms')
@UseGuards(JwtAuthGuard)
export class GymsController {
  constructor(private readonly gymsService: GymsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createGym(@Req() req, @Body() dto: CreateGymDto) {
    return this.gymsService.createGym(req.user.userId, dto);
  }

  @Get()
  getGyms(@Req() req, @Query('organizationId') organizationId: string) {
    return this.gymsService.getGyms(req.user.userId, organizationId);
  }

  @Put(':id')
  updateGym(@Req() req, @Param('id') id: string, @Body() dto: UpdateGymDto) {
    return this.gymsService.updateGym(req.user.userId, id, dto);
  }

  @Get(':id/metrics')
  getGymMetrics(@Req() req, @Param('id') id: string) {
    return this.gymsService.getGymMetrics(req.user.userId, id);
  }

  @Get(':id/occupancy')
  getOccupancy(@Req() req, @Param('id') id: string) {
    return this.gymsService.getOccupancy(req.user.userId, id);
  }
}
