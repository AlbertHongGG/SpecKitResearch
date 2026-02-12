import { HttpError } from '../errors/errors';

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export function validateUpload(params: {
  mimeType: string;
  size: number;
}) {
  const { mimeType, size } = params;

  if (size <= 0 || size > MAX_BYTES) {
    throw new HttpError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: '檔案大小不合法',
      details: { maxBytes: MAX_BYTES, size },
    });
  }

  const allowed = mimeType.startsWith('image/') || mimeType === 'application/pdf';
  if (!allowed) {
    throw new HttpError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: '不支援的檔案格式',
      details: { mimeType },
    });
  }
}
