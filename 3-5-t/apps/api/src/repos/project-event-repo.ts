import type { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export type ProjectEventRow = {
  seq: number;
  projectId: string;
  eventId: string;
  type: string;
  ts: Date;
  payload: unknown;
};

export async function appendProjectEvent(
  prisma: PrismaLike,
  input: {
    projectId: string;
    type: string;
    payload: unknown;
    eventId?: string;
    ts?: Date;
  }
): Promise<ProjectEventRow> {
  return prisma.projectEvent.create({
    data: {
      projectId: input.projectId,
      type: input.type,
      payload: input.payload as any,
      eventId: input.eventId ?? randomUUID(),
      ts: input.ts ?? new Date(),
    },
  });
}

export async function listProjectEventsSince(
  prisma: PrismaLike,
  input: {
    projectId: string;
    sinceSeq: number;
    limit: number;
  }
): Promise<ProjectEventRow[]> {
  return prisma.projectEvent.findMany({
    where: {
      projectId: input.projectId,
      seq: { gt: input.sinceSeq },
    },
    orderBy: { seq: 'asc' },
    take: input.limit,
  });
}

export async function getLatestProjectSeq(prisma: PrismaLike, projectId: string): Promise<number> {
  const last = await prisma.projectEvent.findFirst({
    where: { projectId },
    orderBy: { seq: 'desc' },
    select: { seq: true },
  });
  return last?.seq ?? 0;
}
