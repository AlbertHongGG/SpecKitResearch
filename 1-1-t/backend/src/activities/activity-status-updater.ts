import type { PrismaService } from '../common/prisma/prisma.service';

export async function syncActivityStatusWithCapacity(
  prisma: PrismaService,
  activityId: string,
) {
  const activity = await prisma.activity.findUnique({ where: { id: activityId } });
  if (!activity) return;

  if (activity.status === 'published' && activity.registeredCount >= activity.capacity) {
    await prisma.activity.update({
      where: { id: activityId },
      data: { status: 'full' },
    });
    return;
  }

  if (activity.status === 'full' && activity.registeredCount < activity.capacity) {
    await prisma.activity.update({
      where: { id: activityId },
      data: { status: 'published' },
    });
  }
}
