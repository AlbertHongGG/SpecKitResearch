import crypto from 'node:crypto';
import { conflict } from '../../api/errors.js';
import { assertCanTransition, type OrderStatus } from '../../domain/order/orderStateMachine.js';
import { appendOrderStateEvent } from './orderEvents.js';
import { updateOrderStatus, getOrderByOrderNo } from '../../repositories/orderRepo.js';
import { createReturnLog } from '../../repositories/returnLogRepo.js';
import { enqueueWebhookJob } from '../../repositories/webhookJobRepo.js';

export function buildCallbackPayload(input: {
  orderNo: string;
  status: OrderStatus;
  amount: number;
  currency: string;
  completedAt: Date | null;
  errorCode: string | null;
  errorMessage: string | null;
  returnLogId: string;
  eventId: string;
}) {
  return {
    order_no: input.orderNo,
    status: input.status,
    amount: input.amount,
    currency: input.currency,
    completed_at: input.completedAt?.toISOString() ?? null,
    error_code: input.errorCode,
    error_message: input.errorMessage,
    return_log_id: input.returnLogId,
    event_id: input.eventId,
  };
}

export async function simulatePaymentNow(input: {
  orderNo: string;
  actorType: 'user' | 'admin';
  actorUserId: string;
}): Promise<{ status: OrderStatus; completedAt: Date | null; returnDispatchUrl: string }>{
  const order = await getOrderByOrderNo(input.orderNo);
  if (!order) throw conflict('ORDER_NOT_FOUND', 'Order not found');

  if (order.status !== 'payment_pending') {
    throw conflict('ORDER_NOT_PAYABLE', 'Order is not in payment_pending');
  }

  const scenario = order.simulationScenario;
  const toStatus: OrderStatus =
    scenario === 'success'
      ? 'paid'
      : scenario === 'failed'
        ? 'failed'
        : scenario === 'cancelled'
          ? 'cancelled'
          : scenario === 'timeout'
            ? 'timeout'
            : 'paid';

  if (scenario === 'delayed_success' && order.delaySec > 0) {
    // Accept; completion will be done later.
    scheduleDelayedSuccess({
      orderNo: order.orderNo,
      delaySec: order.delaySec,
      actorUserId: input.actorUserId,
    });
    return { status: 'payment_pending', completedAt: null, returnDispatchUrl: `/complete/${order.orderNo}` };
  }

  assertCanTransition(order.status as OrderStatus, toStatus);
  const completedAt = new Date();

  const updated = await updateOrderStatus(order.id, toStatus, completedAt);
  await appendOrderStateEvent({
    orderId: order.id,
    fromStatus: order.status as OrderStatus,
    toStatus,
    trigger: 'simulate_payment',
    actorType: input.actorType,
    actorUserId: input.actorUserId,
    meta: {
      error_code: order.errorCode,
      error_message: order.errorMessage,
      delay_sec: order.delaySec,
    },
  });

  const eventId = crypto.randomUUID();
  const returnLog = await createReturnLog({
    orderId: order.id,
    callbackUrl: order.callbackUrl,
    returnMethod: order.returnMethod,
    payload: {},
    success: toStatus === 'paid',
  });

  const payload = buildCallbackPayload({
    orderNo: order.orderNo,
    status: updated.status as OrderStatus,
    amount: updated.amount,
    currency: updated.currency,
    completedAt,
    errorCode: updated.errorCode,
    errorMessage: updated.errorMessage,
    returnLogId: returnLog.id,
    eventId,
  });

  // Update payload snapshot.
  await (async () => {
    const prisma = (await import('../../lib/db.js')).getPrisma();
    await prisma.returnLog.update({ where: { id: returnLog.id }, data: { payload } });
  })();

  if (order.webhookUrl && order.webhookEndpointId) {
    const delay = order.webhookDelaySec ?? order.delaySec;
    const runAt = new Date(Date.now() + Math.max(0, delay) * 1000);
    await enqueueWebhookJob({
      orderId: order.id,
      webhookEndpointId: order.webhookEndpointId,
      url: order.webhookUrl,
      eventId,
      runAt,
    });
  }

  return { status: updated.status as OrderStatus, completedAt, returnDispatchUrl: `/complete/${order.orderNo}` };
}

function scheduleDelayedSuccess(input: { orderNo: string; delaySec: number; actorUserId: string }) {
  setTimeout(async () => {
    const order = await getOrderByOrderNo(input.orderNo);
    if (!order) return;
    if (order.status !== 'payment_pending') return;

    const completedAt = new Date();
    const toStatus: OrderStatus = 'paid';

    try {
      assertCanTransition(order.status as OrderStatus, toStatus);
      const updated = await updateOrderStatus(order.id, toStatus, completedAt);
      await appendOrderStateEvent({
        orderId: order.id,
        fromStatus: 'payment_pending',
        toStatus,
        trigger: 'delayed_success',
        actorType: 'system',
        actorUserId: input.actorUserId,
        meta: { delay_sec: input.delaySec },
      });

      const eventId = crypto.randomUUID();
      const returnLog = await createReturnLog({
        orderId: order.id,
        callbackUrl: updated.callbackUrl,
        returnMethod: updated.returnMethod,
        payload: {},
        success: true,
      });

      const payload = buildCallbackPayload({
        orderNo: updated.orderNo,
        status: updated.status as OrderStatus,
        amount: updated.amount,
        currency: updated.currency,
        completedAt,
        errorCode: updated.errorCode,
        errorMessage: updated.errorMessage,
        returnLogId: returnLog.id,
        eventId,
      });

      const prisma = (await import('../../lib/db.js')).getPrisma();
      await prisma.returnLog.update({ where: { id: returnLog.id }, data: { payload } });

      if (updated.webhookUrl && updated.webhookEndpointId) {
        const delay = updated.webhookDelaySec ?? updated.delaySec;
        const runAt = new Date(Date.now() + Math.max(0, delay) * 1000);
        await enqueueWebhookJob({
          orderId: updated.id,
          webhookEndpointId: updated.webhookEndpointId,
          url: updated.webhookUrl,
          eventId,
          runAt,
        });
      }
    } catch {
      // Ignore delayed completion errors.
    }
  }, input.delaySec * 1000);
}
