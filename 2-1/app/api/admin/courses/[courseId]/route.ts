import { prisma } from '@/db/prisma';
import { requireRole } from '@/lib/auth/guards';
import { AppError } from '@/lib/errors/AppError';
import { ok } from '@/lib/http/apiResponse';
import { withErrorHandling } from '@/lib/http/withErrorHandling';

export const GET = withErrorHandling(async (_req, ctx: any) => {
  await requireRole(['admin']);

  const courseId = ctx.params.courseId as string;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      instructor: { select: { id: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true } },
      category: true,
      tags: { include: { tag: true } },
      sections: { include: { lessons: true }, orderBy: { order: 'asc' } },
    },
  });

  if (!course) throw AppError.notFound();
  return ok({ course });
});
