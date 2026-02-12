import { prisma } from '@/db/prisma';
import { requireRole } from '@/lib/auth/guards';
import { AppError } from '@/lib/errors/AppError';
import { ok } from '@/lib/http/apiResponse';
import { withErrorHandling } from '@/lib/http/withErrorHandling';
import { parseJson } from '@/lib/http/validate';
import { assertSameOrigin } from '@/lib/security/sameOrigin';
import { z } from 'zod';

const bodySchema = z.object({ fileId: z.string().min(1) });

export const POST = withErrorHandling(async (req, ctx) => {
  assertSameOrigin(req);

  const user = await requireRole(['instructor', 'admin']);
  const courseId = ctx.params.courseId;

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true, instructorId: true, status: true } });
  if (!course) throw AppError.notFound();
  if (user.role !== 'admin' && course.instructorId !== user.id) throw AppError.notFound();

  const body = await parseJson(req, bodySchema);

  const asset = await prisma.fileAsset.findUnique({ where: { id: body.fileId } });
  if (!asset) throw AppError.badRequest('檔案不存在');

  if (!asset.mimeType.startsWith('image/')) {
    throw AppError.badRequest('封面必須是圖片');
  }

  if (asset.courseId && asset.courseId !== courseId) {
    throw AppError.badRequest('檔案已綁定其他課程');
  }

  await prisma.fileAsset.update({
    where: { id: body.fileId },
    data: { visibility: 'public', courseId },
  });

  await prisma.course.update({ where: { id: courseId }, data: { coverFileId: body.fileId } });

  return ok({ coverImageUrl: `/api/files/${body.fileId}` });
});
