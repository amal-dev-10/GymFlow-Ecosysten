import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { BadRequestException } from '@nestjs/common';

// PLT-015 Branding uploads (logo/favicon): same real, minimal local-disk
// pattern as PLT-011's support attachments (see multer.config.ts there) -
// local storage under apps/api/uploads/branding/, served via static
// middleware registered in main.ts. Image-only, smaller limits than support
// attachments since these are just logos/favicons, not arbitrary documents.
export const BRANDING_UPLOADS_DIR = join(process.cwd(), 'uploads', 'branding');
export const BRANDING_UPLOADS_URL_PREFIX = '/uploads/branding';

mkdirSync(BRANDING_UPLOADS_DIR, { recursive: true });

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB (covers both logo and favicon uploads)
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon'];

export const brandingUploadMulterOptions = {
  storage: diskStorage({
    destination: BRANDING_UPLOADS_DIR,
    filename: (_req: any, file: any, cb: (error: Error | null, filename: string) => void) => {
      cb(null, `${randomUUID()}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req: any, file: any, cb: (error: Error | null, accept: boolean) => void) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new BadRequestException(`File type "${file.mimetype}" is not allowed for branding uploads.`), false);
    }
    cb(null, true);
  },
};
