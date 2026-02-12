import { AppError } from '@/lib/errors/AppError';

export const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);

export function assertAllowedMimeType(mimeType: string) {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw AppError.badRequest('不支援的檔案類型', { mimeType });
  }
}
