import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env variables from apps/api/.env
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded, static as expressStatic } from 'express';
import { SUPPORT_UPLOADS_DIR, SUPPORT_UPLOADS_URL_PREFIX } from './modules/platform-support/attachments/multer.config';
import { BRANDING_UPLOADS_DIR, BRANDING_UPLOADS_URL_PREFIX } from './modules/platform-global-settings/branding-upload.multer.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));
  // PLT-011 support ticket attachments - local disk storage served
  // statically. See multer.config.ts's doc comment for the honest MVP
  // scoping (not production-grade cloud storage).
  app.use(SUPPORT_UPLOADS_URL_PREFIX, expressStatic(SUPPORT_UPLOADS_DIR));
  // PLT-015 branding logo/favicon uploads - same local-disk pattern.
  app.use(BRANDING_UPLOADS_URL_PREFIX, expressStatic(BRANDING_UPLOADS_DIR));
  // In production the two frontends live on different origins
  // (e.g. https://gymflow.io and https://admin.gymflow.io). Restrict CORS to
  // the comma-separated CORS_ORIGINS allow-list when set; otherwise stay open
  // for local development.
  const corsOrigins = process.env.CORS_ORIGINS
    ?.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors(
    corsOrigins && corsOrigins.length > 0
      ? { origin: corsOrigins, credentials: true }
      : {},
  );
  await app.listen(process.env.PORT ?? 5000, '0.0.0.0');
}
bootstrap();

