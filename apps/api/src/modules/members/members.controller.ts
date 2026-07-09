import { Controller, Post, Body, Req, UseGuards, Param, HttpCode, HttpStatus, Get, Query, Patch } from '@nestjs/common';
import { MembersService } from './members.service';
import { CreateMemberDto, AddMeasurementDto } from './dto/member.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { TenantGuard } from '../../core/guards/tenant.guard';
import { PermissionsGuard } from '../../core/guards/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';

@Controller('v1/members')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @RequirePermissions({ resource: 'member', action: 'view' })
  @Get()
  @HttpCode(HttpStatus.OK)
  listMembers(
    @Req() req,
    @Query('homeGymId') homeGymId?: string,
    @Query('gymId') gymId?: string,
    @Query('search') search?: string,
  ) {
    return this.membersService.listMembers(req.organizationId, homeGymId || gymId, search);
  }

  @RequirePermissions({ resource: 'member', action: 'view' })
  @Get('lookup/global')
  @HttpCode(HttpStatus.OK)
  lookupGlobal(@Query('phoneNumber') phoneNumber: string) {
    return this.membersService.lookupGlobalMember(phoneNumber);
  }

  @RequirePermissions({ resource: 'member', action: 'view' })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  getMemberDetails(@Req() req, @Param('id') id: string) {
    return this.membersService.getMemberDetails(req.organizationId, id);
  }

  @RequirePermissions({ resource: 'member', action: 'update' })
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  updateMember(@Req() req, @Param('id') id: string, @Body() dto: any) {
    return this.membersService.updateMember(req.organizationId, id, dto, req.user?.userId);
  }

  @RequirePermissions({ resource: 'member', action: 'create' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createMember(@Req() req, @Body() dto: CreateMemberDto) {
    return this.membersService.createMember(req.organizationId, dto, req.user?.userId);
  }

  @RequirePermissions({ resource: 'member', action: 'update' })
  @Post(':id/measurements')
  @HttpCode(HttpStatus.CREATED)
  addMeasurement(@Req() req, @Param('id') id: string, @Body() dto: AddMeasurementDto) {
    return this.membersService.addMeasurement(req.organizationId, id, dto);
  }

  @RequirePermissions({ resource: 'member', action: 'view' })
  @Get(':id/qr')
  @HttpCode(HttpStatus.OK)
  generateQrCode(@Req() req, @Param('id') id: string) {
    return this.membersService.generateQrCode(req.organizationId, id);
  }
}

@Controller('v1/public/members')
export class PublicMembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get('branches')
  async listBranches(@Query('organizationId') organizationId: string) {
    if (!organizationId) {
      return [];
    }
    return this.membersService.listBranchesPublic(organizationId);
  }

  // Phone verification is org-agnostic — it proves the shared "global account"
  // identity behind the phone number, not membership at any one gym.
  @Post('phone/send-otp')
  @HttpCode(HttpStatus.OK)
  sendPhoneOtp(@Body() dto: { phoneNumber: string }) {
    return this.membersService.sendPhoneOtp(dto.phoneNumber);
  }

  @Post('phone/verify-otp')
  @HttpCode(HttpStatus.OK)
  verifyPhoneOtp(@Body() dto: { phoneNumber: string; code: string }) {
    return this.membersService.verifyPhoneOtp(dto.phoneNumber, dto.code);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async registerMember(
    @Body() dto: {
      organizationId: string;
      homeGymId: string;
      firstName: string;
      lastName: string;
      phoneNumber: string;
      dob?: string;
      gender?: string;
      aiInsights?: any;
    }
  ) {
    return this.membersService.createMember(dto.organizationId, {
      homeGymId: dto.homeGymId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phoneNumber: dto.phoneNumber,
      dob: dto.dob,
      gender: dto.gender,
      aiInsights: dto.aiInsights,
    });
  }
}
