import { ApiError } from '../observability/errors.js';

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export function validateAttachmentMetadata(params: {
  filename: string;
  contentType: string;
  sizeBytes: number;
}) {
  if (!params.filename || params.filename.length > 255) {
    throw new ApiError({ statusCode: 400, code: 'ValidationError', message: 'Invalid filename' });
  }
  if (!params.contentType || params.contentType.length > 255) {
    throw new ApiError({ statusCode: 400, code: 'ValidationError', message: 'Invalid content type' });
  }
  if (!Number.isFinite(params.sizeBytes) || params.sizeBytes < 0 || params.sizeBytes > MAX_SIZE_BYTES) {
    throw new ApiError({
      statusCode: 400,
      code: 'ValidationError',
      message: 'Invalid file size',
      details: { maxSizeBytes: MAX_SIZE_BYTES },
    });
  }
}
