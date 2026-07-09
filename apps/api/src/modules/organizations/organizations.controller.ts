import { Controller, Post, Get, Put, Param, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';

@Controller('v1/organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createOrganization(@Req() req, @Body() dto: CreateOrganizationDto) {
    return this.organizationsService.createOrganization(req.user.userId, dto);
  }

  @Get()
  getUserOrganizations(@Req() req) {
    return this.organizationsService.getUserOrganizations(req.user.userId);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  updateOrganization(@Param('id') id: string, @Req() req, @Body() dto: UpdateOrganizationDto) {
    return this.organizationsService.updateOrganization(id, req.user.userId, dto);
  }

  @Get(':id/overview')
  @HttpCode(HttpStatus.OK)
  getOrganizationOverview(@Param('id') id: string, @Req() req) {
    return this.organizationsService.getOrganizationOverview(id, req.user.userId);
  }
}
