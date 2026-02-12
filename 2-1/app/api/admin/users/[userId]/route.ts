import { requireRole } from '@/lib/auth/guards';
import { AppError } from '@/lib/errors/AppError';
import { ok } from '@/lib/http/apiResponse';
import { withErrorHandling } from '@/lib/http/withErrorHandling';
import { parseJson } from '@/lib/http/validate';
import { assertSameOrigin } from '@/lib/security/sameOrigin';
import { revokeAllSessionsForUser } from '@/lib/auth/sessionStore';
import { adminUpdateUserBodySchema } from '@/lib/validators/adminUsers';
import { prisma } from '@/db/prisma';
import { updateUser } from '@/services/adminRepo';

export const PATCH = withErrorHandling(async (req, ctx: any) => {
  assertSameOrigin(req);

  await requireRole(['admin']);
  const userId = ctx.params.userId as string;

  const body = await parseJson(req, adminUpdateUserBodySchema);

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) throw AppError.notFound();

  const updated = await updateUser(userId, { role: body.role, isActive: body.isActive });

  if (body.isActive === false) {
    await revokeAllSessionsForUser(userId);
  }

  return ok({ user: updated });
});
