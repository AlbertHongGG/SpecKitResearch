import { prisma } from '@/db/prisma';
import { requireRole } from '@/lib/auth/guards';
import { AppError } from '@/lib/errors/AppError';
import { created, ok } from '@/lib/http/apiResponse';
import { withErrorHandling } from '@/lib/http/withErrorHandling';
import { parseJson } from '@/lib/http/validate';
import { assertSameOrigin } from '@/lib/security/sameOrigin';
import { adminCreateCategoryBodySchema } from '@/lib/validators/taxonomy';

export const GET = withErrorHandling(async () => {
  await requireRole(['admin']);
  const categories = await prisma.courseCategory.findMany({ orderBy: { name: 'asc' } });
  return ok({ categories });
});

export const POST = withErrorHandling(async (req) => {
  assertSameOrigin(req);
  await requireRole(['admin']);

  const body = await parseJson(req, adminCreateCategoryBodySchema);

  try {
    const category = await prisma.courseCategory.create({
      data: { name: body.name, isActive: true },
    });
    return created({ category });
  } catch (e: any) {
    if (e?.code === 'P2002') throw AppError.conflict('分類名稱已存在');
    throw e;
  }
});
