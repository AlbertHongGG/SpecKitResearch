import crypto from 'node:crypto';
import { createReplayRun, finishReplayRun } from '../../repositories/replayRunRepo.js';
import { createReturnLog } from '../../repositories/returnLogRepo.js';
import { enqueueWebhookJob } from '../../repositories/webhookJobRepo.js';
import { getOrderByOrderNo } from '../../repositories/orderRepo.js';
import { conflict } from '../../api/errors.js';
import { buildCallbackPayload } from '../orders/simulatePayment.js';

export async function createReplay(input: {
  orderNo: string;
  scope: 'webhook_only' | 'full_flow';
  createdByUserId: string;
}) {
  const order = await getOrderByOrderNo(input.orderNo);
  if (!order) throw conflict('ORDER_NOT_FOUND', 'Order not found');

  const run = await createReplayRun({
    orderId: order.id,
    scope: input.scope,
    createdByUserId: input.createdByUserId,
  });

  try {
    const eventId = crypto.randomUUID();

    if (input.scope === 'full_flow') {
      const returnLog = await createReturnLog({
        orderId: order.id,
        replayRunId: run.id,
        callbackUrl: order.callbackUrl,
        returnMethod: order.returnMethod,
        payload: {},
        success: order.status === 'paid',
      });

      const payload = buildCallbackPayload({
        orderNo: order.orderNo,
        status: order.status as any,
        amount: order.amount,
        currency: order.currency,
        completedAt: order.completedAt,
        errorCode: order.errorCode,
        errorMessage: order.errorMessage,
        returnLogId: returnLog.id,
        eventId,
      });

      const prisma = (await import('../../lib/db.js')).getPrisma();
      await prisma.returnLog.update({ where: { id: returnLog.id }, data: { payload } });
    }

    if (order.webhookUrl && order.webhookEndpointId) {
      await enqueueWebhookJob({
        orderId: order.id,
        replayRunId: run.id,
        webhookEndpointId: order.webhookEndpointId,
        url: order.webhookUrl,
        eventId,
        runAt: new Date(),
      });
    }

    await finishReplayRun(run.id, 'succeeded', null);
    return run;
  } catch (e: any) {
    await finishReplayRun(run.id, 'failed', String(e?.message ?? e));
    throw e;
  }
}
