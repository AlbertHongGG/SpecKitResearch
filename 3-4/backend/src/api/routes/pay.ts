import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../plugins/requireAuth.js';
import { getOrderByOrderNo, updateOrderStatus } from '../../repositories/orderRepo.js';
import { appendOrderStateEvent } from '../../services/orders/orderEvents.js';
import { assertCanTransition, type OrderStatus } from '../../domain/order/orderStateMachine.js';
import { conflict, notFound, forbidden } from '../errors.js';
import { simulatePaymentNow } from '../../services/orders/simulatePayment.js';
import { audit } from '../../services/audit/AuditService.js';

export const payRoutes: FastifyPluginAsync = async (app) => {
  app.post('/:order_no/enter', async (request) => {
    const user = requireAuth(request);
    const params = z.object({ order_no: z.string().min(1) }).parse(request.params);

    const order = await getOrderByOrderNo(params.order_no);
    if (!order) throw notFound();

    if (order.userId !== user.id && user.role !== 'ADMIN') throw forbidden();

    if (order.status === 'created') {
      assertCanTransition(order.status as OrderStatus, 'payment_pending');
      const updated = await updateOrderStatus(order.id, 'payment_pending', null);
      await appendOrderStateEvent({
        orderId: order.id,
        fromStatus: 'created',
        toStatus: 'payment_pending',
        trigger: 'enter_payment_page',
        actorType: 'user',
        actorUserId: user.id,
        meta: null,
      });

      await audit({
        actorUserId: user.id,
        actorRole: user.role,
        action: 'pay.enter',
        targetType: 'order',
        targetId: order.id,
        requestId: request.requestId,
      });

      return { ok: true, status: updated.status };
    }

    if (order.status === 'payment_pending') {
      return { ok: true, status: order.status };
    }

    throw conflict('ORDER_TERMINAL_IMMUTABLE', 'Order already terminal');
  });

  app.post('/:order_no/simulate', async (request) => {
    const user = requireAuth(request);
    const params = z.object({ order_no: z.string().min(1) }).parse(request.params);

    const order = await getOrderByOrderNo(params.order_no);
    if (!order) throw notFound();
    if (order.userId !== user.id && user.role !== 'ADMIN') throw forbidden();

    const result = await simulatePaymentNow({
      orderNo: order.orderNo,
      actorType: user.role === 'ADMIN' ? 'admin' : 'user',
      actorUserId: user.id,
    });

    await audit({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'pay.simulate',
      targetType: 'order',
      targetId: order.id,
      requestId: request.requestId,
      meta: { status: result.status },
    });

    return {
      ok: true,
      order_no: order.orderNo,
      status: result.status,
      completed_at: result.completedAt ? result.completedAt.toISOString() : null,
      return_dispatch_url: result.returnDispatchUrl,
    };
  });
};
