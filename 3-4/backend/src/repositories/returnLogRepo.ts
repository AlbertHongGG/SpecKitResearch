import { getPrisma } from '../lib/db.js';

export async function createReturnLog(input: {
  orderId: string;
  replayRunId?: string | null;
  callbackUrl: string;
  returnMethod: 'query_string' | 'post_form';
  payload: any;
  success: boolean;
  errorSummary?: string | null;
}) {
  const prisma = getPrisma();
  return prisma.returnLog.create({
    data: {
      orderId: input.orderId,
      replayRunId: input.replayRunId ?? null,
      callbackUrl: input.callbackUrl,
      returnMethod: input.returnMethod,
      payload: input.payload,
      success: input.success,
      initiatedAt: new Date(),
      errorSummary: input.errorSummary ?? null,
    },
  });
}

export async function markReturnClientSignal(returnLogId: string) {
  const prisma = getPrisma();
  return prisma.returnLog.update({
    where: { id: returnLogId },
    data: { clientSignalAt: new Date() },
  });
}

export async function ackReturn(returnLogId: string) {
  const prisma = getPrisma();
  return prisma.returnLog.update({
    where: { id: returnLogId },
    data: { ackAt: new Date() },
  });
}
