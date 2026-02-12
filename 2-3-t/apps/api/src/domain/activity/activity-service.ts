import type { Prisma, PrismaClient } from '@prisma/client';
import { insertActivity, type ActivityInsert } from '../../repos/activity-repo';
import { appendProjectEvent, type ProjectEventRow } from '../../repos/project-event-repo';

export async function appendActivity(
  tx: Prisma.TransactionClient,
  activity: ActivityInsert
) {
  return insertActivity(tx, activity);
}

export async function appendActivityWithRealtimeEvent(
  tx: Prisma.TransactionClient,
  activity: ActivityInsert
): Promise<{ activity: Awaited<ReturnType<typeof insertActivity>>; event: ProjectEventRow }> {
  const row = await insertActivity(tx, activity);

  const payload = {
    id: row.id,
    projectId: row.projectId,
    actorId: row.actorId,
    entityType: row.entityType,
    entityId: row.entityId,
    action: row.action,
    timestamp: row.timestamp.toISOString(),
    metadata: row.metadata as any,
  };

  const event = await appendProjectEvent(tx, {
    projectId: row.projectId,
    type: 'activity.appended',
    ts: row.timestamp,
    payload,
  });

  return { activity: row, event };
}

export async function withActivity<T>(
  prisma: PrismaClient,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(fn, {
    maxWait: 5_000,
    timeout: 10_000,
  });
}
