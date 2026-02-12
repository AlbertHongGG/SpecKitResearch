import type { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { getLatestProjectSeq } from '../repos/project-event-repo';

function iso(d: Date) {
  return d.toISOString();
}

export async function buildRealtimeSnapshotPayload(prisma: PrismaClient, projectId: string) {
  const [project, boards, lists, tasks, memberships] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId } }),
    prisma.board.findMany({ where: { projectId }, orderBy: { order: 'asc' } }),
    prisma.list.findMany({
      where: { board: { projectId } },
      orderBy: [{ board: { order: 'asc' } }, { order: 'asc' }],
    }),
    prisma.task.findMany({
      where: { projectId },
      include: { assignees: true },
      orderBy: [{ listId: 'asc' }, { position: 'asc' }, { id: 'asc' }],
    }),
    prisma.projectMembership.findMany({ where: { projectId }, orderBy: { joinedAt: 'asc' } }),
  ]);

  if (!project) return null;

  return {
    project: {
      ...project,
      createdAt: iso(project.createdAt),
      updatedAt: iso(project.updatedAt),
    },
    boards: boards.map((b) => ({ ...b, createdAt: iso(b.createdAt), updatedAt: iso(b.updatedAt) })),
    lists: lists.map((l) => ({ ...l, createdAt: iso(l.createdAt), updatedAt: iso(l.updatedAt) })),
    tasks: tasks.map((t) => ({
      ...t,
      dueDate: t.dueDate ? iso(t.dueDate) : null,
      createdAt: iso(t.createdAt),
      updatedAt: iso(t.updatedAt),
      assignees: t.assignees.map((a) => ({ ...a, assignedAt: iso(a.assignedAt) })),
    })),
    memberships: memberships.map((m) => ({ ...m, joinedAt: iso(m.joinedAt) })),
  };
}

export async function makeSnapshotMessage(prisma: PrismaClient, projectId: string) {
  const payload = await buildRealtimeSnapshotPayload(prisma, projectId);
  if (!payload) return null;

  const seq = await getLatestProjectSeq(prisma, projectId);
  return {
    type: 'snapshot',
    projectId,
    eventId: randomUUID(),
    seq,
    ts: new Date().toISOString(),
    payload,
  };
}
