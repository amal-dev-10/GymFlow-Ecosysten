import { Body, Controller, Get, Param, Post, Put, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PlatformGlobalSettingsService } from './platform-global-settings.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../platform-plans/guards/platform-admin.guard';
import { PlatformPermissionGuard } from '../platform-roles/guards/platform-permission.guard';
import { RequirePlatformPermission } from '../platform-roles/decorators/require-platform-permission.decorator';
import { UpdateSettingsCategoryDto } from './dto/update-category.dto';
import { ImportSettingsDto } from './dto/import-settings.dto';
import { brandingUploadMulterOptions, BRANDING_UPLOADS_URL_PREFIX } from './branding-upload.multer.config';

const actorName = (req: any) => req.user.fullName || req.user.email || 'Platform Admin';

// Every route requires at least 'global_settings.view' at the guard level.
// The write routes (PUT :category, restore-defaults) don't gate by a static
// 'configure' decorator, because 'system' needs a *different*, narrower key
// ('global_settings.manage_system', granted to Developer) than every other
// category ('global_settings.configure', granted to Operations/Super Admin).
// That per-category check happens inside the service (assertCanEdit) so
// there's one route shape, not a second controller competing for the same
// path (which would create Express route-ordering ambiguity).
@Controller('v1/platform/settings')
@UseGuards(JwtAuthGuard, PlatformAdminGuard, PlatformPermissionGuard)
export class PlatformGlobalSettingsController {
  constructor(private readonly service: PlatformGlobalSettingsService) {}

  @RequirePlatformPermission('global_settings.view')
  @Get('dashboard')
  getDashboard() {
    return this.service.getDashboardSummary();
  }

  @RequirePlatformPermission('global_settings.view')
  @Get('export')
  exportAll() {
    return this.service.exportAll();
  }

  @RequirePlatformPermission('global_settings.view')
  @Post('import')
  importAll(@Req() req, @Body() dto: ImportSettingsDto) {
    return this.service.importAll(dto.settings, req.user.userId, actorName(req));
  }

  @RequirePlatformPermission('global_settings.view')
  @Get('versions')
  getVersions(@Query('category') category?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.getVersionHistory(category, page ? Number(page) : 1, limit ? Number(limit) : 25);
  }

  @RequirePlatformPermission('global_settings.view')
  @Post('versions/:versionId/restore')
  restoreVersion(@Param('versionId') versionId: string, @Req() req) {
    return this.service.restoreVersion(versionId, req.user.userId, actorName(req));
  }

  @RequirePlatformPermission('global_settings.view')
  @Get()
  getAll() {
    return this.service.getAllSettings();
  }

  @RequirePlatformPermission('global_settings.view')
  @Get(':category')
  getCategory(@Param('category') category: string) {
    return this.service.getCategory(category);
  }

  @RequirePlatformPermission('global_settings.view')
  @Put(':category')
  updateCategory(@Param('category') category: string, @Req() req, @Body() dto: UpdateSettingsCategoryDto) {
    return this.service.updateCategory(category, dto.values, req.user.userId, actorName(req), dto.changeNote);
  }

  @RequirePlatformPermission('global_settings.view')
  @Post(':category/restore-defaults')
  restoreDefaults(@Param('category') category: string, @Req() req) {
    return this.service.restoreDefaults(category, req.user.userId, actorName(req));
  }

  // Gated by the base 'global_settings.view' at the guard level; the actual
  // save that persists the returned URL into Branding settings goes through
  // updateCategory above, which applies the real 'configure' check.
  @RequirePlatformPermission('global_settings.view')
  @Post('branding/upload')
  @UseInterceptors(FileInterceptor('file', brandingUploadMulterOptions))
  uploadBrandingAsset(@UploadedFile() file: Express.Multer.File) {
    return { url: `${BRANDING_UPLOADS_URL_PREFIX}/${file.filename}`, originalName: file.originalname, size: file.size };
  }
}

// Unauthenticated by design: a mobile client checks force-update/maintenance
// status before a user has logged in. Read-only, exposes only the Mobile
// Apps category, nothing sensitive - same public-endpoint precedent as
// auth's own OTP request routes. Separate controller (no @UseGuards) so
// this one route never accidentally inherits the authenticated guards above.
@Controller('v1/platform/settings-public')
export class PlatformGlobalSettingsPublicController {
  constructor(private readonly service: PlatformGlobalSettingsService) {}

  @Get('mobile-version-check')
  getMobileVersionCheck() {
    return this.service.getMobileVersionCheck();
  }

  @Get('brand')
  getPublicBrand() {
    return this.service.getPublicBrand();
  }
}
