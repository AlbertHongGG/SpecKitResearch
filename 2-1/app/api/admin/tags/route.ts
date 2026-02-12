import { prisma } from '@/db/prisma';
import { requireRole } from '@/lib/auth/guards';
import { AppError } from '@/lib/errors/AppError';
import { created, ok } from '@/lib/http/apiResponse';
import { withErrorHandling } from '@/lib/http/withErrorHandling';
import { parseJson } from '@/lib/http/validate';
import { assertSameOrigin } from '@/lib/security/sameOrigin';
import { adminCreateTagBodySchema } from '@/lib/validators/taxonomy';

export const GET = withErrorHandling(async () => {
  await requireRole(['admin']);
  const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } });
  return ok({ tags });
});

export const POST = withErrorHandling(async (req) => {
  assertSameOrigin(req);
  await requireRole(['admin']);

  const body = await parseJson(req, adminCreateTagBodySchema);

  try {
    const tag = await prisma.tag.create({ data: { name: body.name, isActive: true } });
    return created({ tag });
  } catch (e: any) {
    if (e?.code === 'P2002') throw AppError.conflict('標籤名稱已存在');
    throw e;
  }
});
