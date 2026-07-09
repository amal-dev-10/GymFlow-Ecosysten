import { Controller, Post, Body, Req, UseGuards, Param, HttpCode, HttpStatus, Get, Query, Patch, Delete } from '@nestjs/common';
import { MetadataService } from './metadata.service';
import { CreateMetadataDto, UpdateMetadataDto, MergeMetadataDto, BulkImportDto } from './dto/metadata.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { TenantGuard } from '../../core/guards/tenant.guard';
import { PermissionsGuard } from '../../core/guards/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';

@Controller('v1/metadata')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class MetadataController {
  constructor(private readonly metadataService: MetadataService) {}

  @RequirePermissions({ resource: 'workout', action: 'view' })
  @Get()
  @HttpCode(HttpStatus.OK)
  listMetadata(
    @Req() req,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('source') source?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.metadataService.listMetadata(req.organizationId, {
      type,
      search,
      status,
      source,
      page,
      limit,
    });
  }

  @RequirePermissions({ resource: 'workout', action: 'view' })
  @Get('analytics')
  @HttpCode(HttpStatus.OK)
  getAnalytics(@Req() req) {
    return this.metadataService.getAnalytics(req.organizationId);
  }

  @RequirePermissions({ resource: 'workout', action: 'view' })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  getMetadataItem(@Req() req, @Param('id') id: string) {
    return this.metadataService.getMetadataItem(id, req.organizationId);
  }

  @RequirePermissions({ resource: 'workout', action: 'create' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createMetadata(@Req() req, @Body() dto: CreateMetadataDto) {
    return this.metadataService.createMetadata(req.organizationId, req.user.id, req.user.fullName || 'Trainer', dto);
  }

  @RequirePermissions({ resource: 'workout', action: 'update' })
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  updateMetadata(@Req() req, @Param('id') id: string, @Body() dto: UpdateMetadataDto) {
    return this.metadataService.updateMetadata(id, req.organizationId, req.user.id, req.user.fullName || 'Trainer', dto);
  }

  @RequirePermissions({ resource: 'workout', action: 'delete' })
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  softDeleteMetadata(@Req() req, @Param('id') id: string) {
    return this.metadataService.softDeleteMetadata(id, req.organizationId, req.user.id, req.user.fullName || 'Trainer');
  }

  @RequirePermissions({ resource: 'workout', action: 'update' })
  @Post('merge')
  @HttpCode(HttpStatus.OK)
  mergeMetadata(@Req() req, @Body() dto: MergeMetadataDto) {
    return this.metadataService.mergeMetadata(req.organizationId, req.user.id, req.user.fullName || 'Manager', dto);
  }

  @RequirePermissions({ resource: 'workout', action: 'update' })
  @Post('import')
  @HttpCode(HttpStatus.CREATED)
  bulkImport(@Req() req, @Body() dto: BulkImportDto) {
    return this.metadataService.bulkImport(req.organizationId, req.user.id, req.user.fullName || 'Manager', dto);
  }
}
