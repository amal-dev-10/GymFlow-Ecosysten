import { Controller, Get, Post, Put, Delete, Param, Body, Query, Req, UseGuards, UseInterceptors, UploadedFile, HttpCode, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PlatformSupportService } from './platform-support.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../platform-plans/guards/platform-admin.guard';
import { PlatformPermissionGuard } from '../platform-roles/guards/platform-permission.guard';
import { RequirePlatformPermission } from '../platform-roles/decorators/require-platform-permission.decorator';
import { supportAttachmentMulterOptions } from './attachments/multer.config';
import { ListTicketsDto } from './dto/list-tickets.dto';
import { CreateTicketDto, UpdateTicketDto, AssignEngineerDto } from './dto/create-ticket.dto';
import { PostMessageDto } from './dto/post-message.dto';
import { BulkTicketActionDto } from './dto/bulk-action.dto';
import { CreateEscalationDto, ResolveEscalationDto } from './dto/escalation.dto';
import { UpdateSlaPolicyDto } from './dto/sla-policy.dto';
import { CreateKbArticleDto, UpdateKbArticleDto } from './dto/kb-article.dto';
import { RecordCsatDto } from './dto/csat.dto';

// Every mutation here goes through PLT-008's permission framework rather
// than the legacy SUPER_ADMIN fallback, same demonstrated pattern as
// platform-audit.controller.ts.
@Controller('v1/platform/support')
@UseGuards(JwtAuthGuard, PlatformAdminGuard, PlatformPermissionGuard)
export class PlatformSupportController {
  constructor(private readonly service: PlatformSupportService) {}

  // --- DASHBOARD / NOTIFICATIONS ---

  @RequirePlatformPermission('support.view_tickets')
  @Get('dashboard')
  getDashboard() {
    return this.service.getDashboard();
  }

  @RequirePlatformPermission('support.view_tickets')
  @Get('notifications')
  getNotifications() {
    return this.service.getNotifications();
  }

  // --- ESCALATIONS ---

  @RequirePlatformPermission('support.view_tickets')
  @Get('escalations')
  listEscalations(@Query() query: { status?: string; page?: number; limit?: number }) {
    return this.service.listEscalations(query);
  }

  @RequirePlatformPermission('support.escalate')
  @Post('escalations/:id/resolve')
  resolveEscalation(@Param('id') id: string, @Req() req, @Body() dto: ResolveEscalationDto) {
    return this.service.resolveEscalation(id, dto, req.user.userId);
  }

  // --- SLA ---

  @RequirePlatformPermission('support.view_tickets')
  @Get('sla/policies')
  listSlaPolicies() {
    return this.service.listSlaPolicies();
  }

  @RequirePlatformPermission('support.manage_sla')
  @Put('sla/policies')
  updateSlaPolicy(@Req() req, @Body() dto: UpdateSlaPolicyDto) {
    return this.service.updateSlaPolicy(dto, req.user.userId);
  }

  @RequirePlatformPermission('support.view_tickets')
  @Get('sla/dashboard')
  getSlaDashboard() {
    return this.service.getSlaDashboard();
  }

  // --- KNOWLEDGE BASE ---

  @RequirePlatformPermission('support.view_tickets')
  @Get('kb')
  listKbArticles(@Query() query: { search?: string; category?: string; type?: string }) {
    return this.service.listKbArticles(query);
  }

  @RequirePlatformPermission('support.manage_kb')
  @Post('kb')
  @HttpCode(HttpStatus.CREATED)
  createKbArticle(@Req() req, @Body() dto: CreateKbArticleDto) {
    return this.service.createKbArticle(dto, req.user.userId);
  }

  @RequirePlatformPermission('support.view_tickets')
  @Get('kb/:id')
  getKbArticle(@Param('id') id: string) {
    return this.service.getKbArticle(id);
  }

  @RequirePlatformPermission('support.manage_kb')
  @Put('kb/:id')
  updateKbArticle(@Param('id') id: string, @Req() req, @Body() dto: UpdateKbArticleDto) {
    return this.service.updateKbArticle(id, dto, req.user.userId);
  }

  @RequirePlatformPermission('support.manage_kb')
  @Delete('kb/:id')
  removeKbArticle(@Param('id') id: string, @Req() req) {
    return this.service.removeKbArticle(id, req.user.userId);
  }

  // --- BULK ACTIONS ---

  @RequirePlatformPermission('support.assign_tickets')
  @Post('bulk')
  bulkAction(@Req() req, @Body() dto: BulkTicketActionDto) {
    return this.service.bulkAction(dto, req.user.userId);
  }

  // --- TICKETS ---

  @RequirePlatformPermission('support.view_tickets')
  @Get('tickets')
  list(@Query() query: ListTicketsDto) {
    return this.service.list(query);
  }

  @RequirePlatformPermission('support.assign_tickets')
  @Post('tickets')
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req, @Body() dto: CreateTicketDto) {
    return this.service.create(dto, req.user.userId);
  }

  @RequirePlatformPermission('support.view_tickets')
  @Get('tickets/:id')
  getTicketWorkspace(@Param('id') id: string) {
    return this.service.getTicketWorkspace(id);
  }

  @RequirePlatformPermission('support.close_tickets')
  @Put('tickets/:id')
  update(@Param('id') id: string, @Req() req, @Body() dto: UpdateTicketDto) {
    return this.service.update(id, dto, req.user.userId);
  }

  @RequirePlatformPermission('support.delete_tickets')
  @Delete('tickets/:id')
  remove(@Param('id') id: string, @Req() req) {
    return this.service.remove(id, req.user.userId);
  }

  @RequirePlatformPermission('support.assign_tickets')
  @Put('tickets/:id/assign')
  assignEngineer(@Param('id') id: string, @Req() req, @Body() dto: AssignEngineerDto) {
    return this.service.assignEngineer(id, dto, req.user.userId);
  }

  @RequirePlatformPermission('support.view_tickets')
  @Post('tickets/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  postMessage(@Param('id') id: string, @Req() req, @Body() dto: PostMessageDto) {
    return this.service.postMessage(id, dto, req.user.userId);
  }

  @RequirePlatformPermission('support.view_tickets')
  @Post('tickets/:id/attachments')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', supportAttachmentMulterOptions))
  uploadAttachment(@Param('id') id: string, @Req() req, @UploadedFile() file: Express.Multer.File, @Body('messageId') messageId?: string) {
    return this.service.attachFile(id, file, req.user.userId, messageId);
  }

  @RequirePlatformPermission('support.escalate')
  @Post('tickets/:id/escalations')
  @HttpCode(HttpStatus.CREATED)
  createEscalation(@Param('id') id: string, @Req() req, @Body() dto: CreateEscalationDto) {
    return this.service.createEscalation(id, dto, req.user.userId);
  }

  @RequirePlatformPermission('support.view_tickets')
  @Post('tickets/:id/csat')
  recordCsat(@Param('id') id: string, @Req() req, @Body() dto: RecordCsatDto) {
    return this.service.recordCsat(id, dto, req.user.userId);
  }
}
