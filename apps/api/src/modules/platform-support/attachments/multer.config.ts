import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { BadRequestException } from '@nestjs/common';

// PLT-011 attachments: real, minimal file storage - local disk under
// apps/api/uploads/support/, served via static middleware (see main.ts).
// Documented as an honest MVP, not production-grade cloud storage; no such
// infra exists anywhere else in this codebase. process.cwd() is apps/api
// (confirmed: nest-cli.json has no webpack bundling, and `nest start` runs
// from the project root where nest-cli.json lives).
export const SUPPORT_UPLOADS_DIR = join(process.cwd(), 'uploads', 'support');
export const SUPPORT_UPLOADS_URL_PREFIX = '/uploads/support';

mkdirSync(SUPPORT_UPLOADS_DIR, { recursive: true });

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
const ALLOWED_MIME_PREFIXES = ['image/', 'application/pdf', 'text/', 'application/msword', 'application/vnd.', 'application/zip', 'application/json'];

export const supportAttachmentMulterOptions = {
  storage: diskStorage({
    destination: SUPPORT_UPLOADS_DIR,
    filename: (_req: any, file: any, cb: (error: Error | null, filename: string) => void) => {
      cb(null, `${randomUUID()}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req: any, file: any, cb: (error: Error | null, accept: boolean) => void) => {
    const allowed = ALLOWED_MIME_PREFIXES.some((p) => file.mimetype.startsWith(p));
    if (!allowed) return cb(new BadRequestException(`File type "${file.mimetype}" is not allowed.`), false);
    cb(null, true);
  },
};
