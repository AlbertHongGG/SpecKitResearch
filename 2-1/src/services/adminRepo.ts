import { prisma } from '@/db/prisma';

const safeUserSelect = {
  id: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function listReviewQueue() {
  return prisma.course.findMany({
    where: { status: 'submitted' },
    orderBy: { updatedAt: 'desc' },
    include: { instructor: { select: safeUserSelect }, category: true },
  });
}

export async function createCourseReview(params: {
  courseId: string;
  adminId: string;
  decision: 'published' | 'rejected';
  reason?: string | null;
}) {
  return prisma.courseReview.create({
    data: {
      courseId: params.courseId,
      adminId: params.adminId,
      decision: params.decision,
      reason: params.reason ?? null,
    },
  });
}

export async function listCourseReviews(courseId: string) {
  return prisma.courseReview.findMany({
    where: { courseId },
    orderBy: { createdAt: 'desc' },
    include: { admin: { select: safeUserSelect } },
  });
}

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: safeUserSelect,
  });
}

export async function updateUser(userId: string, data: { role?: string; isActive?: boolean }) {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: safeUserSelect,
  });
}

export async function listCategories() {
  return prisma.courseCategory.findMany({ orderBy: { name: 'asc' } });
}

export async function listTags() {
  return prisma.tag.findMany({ orderBy: { name: 'asc' } });
}

export async function getStats() {
  const [users, purchases, courses] = await Promise.all([
    prisma.user.count(),
    prisma.purchase.count(),
    prisma.course.findMany({ select: { status: true } }),
  ]);

  const byStatus: Record<string, number> = {};
  for (const c of courses) {
    byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
  }

  return {
    userCount: users,
    purchaseCount: purchases,
    courseCountsByStatus: byStatus,
  };
}
