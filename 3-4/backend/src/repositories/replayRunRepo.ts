import { getPrisma } from '../lib/db.js';

export async function createReplayRun(input: {
  orderId: string;
  scope: 'webhook_only' | 'full_flow';
  createdByUserId: string;
}) {
  const prisma = getPrisma();
  return prisma.replayRun.create({
    data: {
      orderId: input.orderId,
      scope: input.scope,
      createdByUserId: input.createdByUserId,
      startedAt: new Date(),
      status: 'running',
    },
  });
}

export async function finishReplayRun(id: string, status: 'succeeded' | 'failed', errorSummary: string | null) {
  const prisma = getPrisma();
  return prisma.replayRun.update({
    where: { id },
    data: {
      status,
      errorSummary,
      finishedAt: new Date(),
    },
  });
}
