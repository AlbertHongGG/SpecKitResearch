import { prisma } from '@/db/prisma';
import { requireRole } from '@/lib/auth/guards';
import { AppError } from '@/lib/errors/AppError';
import { ok } from '@/lib/http/apiResponse';
import { withErrorHandling } from '@/lib/http/withErrorHandling';
import { parseJson } from '@/lib/http/validate';
import { assertSameOrigin } from '@/lib/security/sameOrigin';
import { adminUpdateTagBodySchema } from '@/lib/validators/taxonomy';

export const PATCH = withErrorHandling(async (req, ctx: any) => {
  assertSameOrigin(req);
  await requireRole(['admin']);

  const tagId = ctx.params.tagId as string;
  const body = await parseJson(req, adminUpdateTagBodySchema);

  try {
    const tag = await prisma.tag.update({
      where: { id: tagId },
      data: { name: body.name, isActive: body.isActive },
    });
    return ok({ tag });
  } catch (e: any) {
    if (e?.code === 'P2025') throw AppError.notFound();
    if (e?.code === 'P2002') throw AppError.conflict('標籤名稱已存在');
    throw e;
  }
});
