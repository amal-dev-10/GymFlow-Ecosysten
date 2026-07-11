import { Controller, Get, Post, Param, Body, Query, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { TenantGuard } from '../../core/guards/tenant.guard';
import { CreateSupportTicketDto, PostSupportMessageDto, SupportCsatDto } from './dto/support.dto';

// Tenant-facing support desk. Every route is scoped to the organization named
// in the x-organization-id header (TenantGuard); any authenticated org member
// can raise and follow up their own tickets — no extra permission required.
@Controller('v1/support')
@UseGuards(JwtAuthGuard, TenantGuard)
export class SupportController {
  constructor(private readonly service: SupportService) {}

  @Get('tickets')
  listTickets(@Req() req, @Query('status') status?: string) {
    return this.service.listTickets(req.organizationId, status);
  }

  @Post('tickets')
  @HttpCode(HttpStatus.CREATED)
  createTicket(@Req() req, @Body() dto: CreateSupportTicketDto) {
    return this.service.createTicket(req.organizationId, req.user?.userId, dto);
  }

  @Get('tickets/:id')
  getTicket(@Req() req, @Param('id') id: string) {
    return this.service.getTicket(req.organizationId, id);
  }

  @Post('tickets/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  postMessage(@Req() req, @Param('id') id: string, @Body() dto: PostSupportMessageDto) {
    return this.service.postMessage(req.organizationId, req.user?.userId, id, dto);
  }

  @Post('tickets/:id/csat')
  @HttpCode(HttpStatus.OK)
  recordCsat(@Req() req, @Param('id') id: string, @Body() dto: SupportCsatDto) {
    return this.service.recordCsat(req.organizationId, id, dto);
  }
}
