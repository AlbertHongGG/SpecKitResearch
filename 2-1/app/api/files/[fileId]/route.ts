import { headers } from 'next/headers';
import { z } from 'zod';

import { currentUser } from '@/lib/auth/currentUser';
import { canReadContent } from '@/lib/access/courseAccess';
import { AppError } from '@/lib/errors/AppError';
import { withErrorHandling } from '@/lib/http/withErrorHandling';
import { parseParams } from '@/lib/http/validate';
import { createReadStream, statFile } from '@/lib/storage/files';
import { parseFileId } from '@/lib/storage/fileId';
import { getCourseById } from '@/services/courseRepo';
import { getFileAssetById } from '@/services/fileRepo';
import { isPurchased } from '@/services/purchaseRepo';

const fileParamsSchema = z.object({
  fileId: z.string().min(1),
});

export const GET = withErrorHandling(async (_req, ctx) => {
  const { params } = ctx as { params: unknown };
  const { fileId: fileIdRaw } = parseParams(params, fileParamsSchema);
  const fileId = parseFileId(fileIdRaw);

  const fileAsset = await getFileAssetById(fileId);
  if (!fileAsset) throw AppError.notFound('找不到檔案');

  if (fileAsset.visibility !== 'public') {
    const user = await currentUser();
    if (!user) throw AppError.unauthorized();

    if (!fileAsset.courseId) {
      throw AppError.forbidden();
    }

    const course = await getCourseById(fileAsset.courseId);
    if (!course) throw AppError.notFound('找不到課程');

    const purchased = await isPurchased(user.id, course.id);
    const isAuthor = user.id === course.instructorId;
    const role = user.role;

    if (!canReadContent({ isAuthor, isPurchased: purchased, role })) {
      throw AppError.forbidden('尚未購買');
    }
  }

  const stat = await statFile(fileAsset.storagePath).catch(() => null);
  if (!stat) throw AppError.notFound('找不到檔案');

  const h = new Headers();
  h.set('Content-Type', fileAsset.mimeType);
  h.set('Content-Length', String(stat.size));
  h.set('Cache-Control', 'private, no-store');

  if (fileAsset.originalName) {
    const encoded = encodeURIComponent(fileAsset.originalName);
    h.set('Content-Disposition', `inline; filename*=UTF-8''${encoded}`);
  }

  // Forward request id if present.
  const reqHeaders = await headers();
  const requestId = reqHeaders.get('x-request-id');
  if (requestId) h.set('x-request-id', requestId);

  const stream = createReadStream(fileAsset.storagePath) as any;
  return new Response(stream, { status: 200, headers: h });
});
