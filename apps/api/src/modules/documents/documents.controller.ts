import { Controller, Post, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { GeneratePresignedUrlDto, ConfirmDocumentUploadDto } from './dto/document.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { TenantGuard } from '../../core/guards/tenant.guard';
import { PermissionsGuard } from '../../core/guards/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';

@Controller('v1/documents')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @RequirePermissions({ resource: 'member', action: 'manage_documents' })
  @Post('presigned-url')
  @HttpCode(HttpStatus.OK)
  generatePresignedUrl(@Req() req, @Body() dto: GeneratePresignedUrlDto) {
    return this.documentsService.generatePresignedUrl(req.organizationId, dto);
  }

  @RequirePermissions({ resource: 'member', action: 'manage_documents' })
  @Post('confirm')
  @HttpCode(HttpStatus.CREATED)
  confirmUpload(@Req() req, @Body() dto: ConfirmDocumentUploadDto) {
    return this.documentsService.confirmUpload(req.organizationId, dto);
  }
}
