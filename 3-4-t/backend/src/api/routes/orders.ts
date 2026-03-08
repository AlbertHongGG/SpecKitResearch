import type { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../middleware/authz';
import { parseBody, parseParams, parseQuery } from '../../lib/validate';
import { OrdersService } from '../../domain/orders/orders_service';
import {
  OrderIdParamsSchema,
  OrdersCreateBodySchema,
  OrdersListQuerySchema,
} from '../schemas/us1';
import { mapOrderDetail, mapOrderSummary } from '../mappers/order_mapper';

export const ordersRoutes: FastifyPluginAsync = async (app) => {
  const service = new OrdersService(app.prisma);

  app.post('/', async (request, reply) => {
    requireAuth(request, reply);
    const input = parseBody(request, OrdersCreateBodySchema);
    const result = await service.create({ userId: request.authUser!.id, input });

    const detail = await app.prisma.order.findUnique({
      where: { id: result.order.id },
      include: {
        state_events: { orderBy: { occurred_at: 'asc' } },
        return_logs: { orderBy: { dispatched_at: 'asc' } },
        webhook_logs: { orderBy: { sent_at: 'asc' } },
        replay_runs: { orderBy: { created_at: 'desc' } },
      },
    });

    reply.status(201);
    return {
      ok: true,
      requestId: request.id,
      data: {
        order: mapOrderDetail({
          order: detail!,
          stateEvents: detail!.state_events,
          returnLogs: detail!.return_logs,
          webhookLogs: detail!.webhook_logs,
          replayRuns: detail!.replay_runs,
        }),
        pay_url: result.payUrl,
      },
    };
  });

  app.get('/', async (request, reply) => {
    requireAuth(request, reply);
    const q = parseQuery(request, OrdersListQuerySchema);
    const list = await service.list({
      userId: request.authUser!.id,
      page: q.page,
      pageSize: q.page_size,
      status: q.status,
      paymentMethod: q.payment_method,
      scenario: q.simulation_scenario,
    });

    return {
      ok: true,
      requestId: request.id,
      data: {
        items: list.items.map(mapOrderSummary),
        page: list.page,
        page_size: list.pageSize,
        total_items: list.totalItems,
        total_pages: list.totalPages,
      },
    };
  });

  app.get('/:id', async (request, reply) => {
    requireAuth(request, reply);
    const p = parseParams(request, OrderIdParamsSchema);
    const order = await service.getById({
      requester: { id: request.authUser!.id, role: request.authUser!.role },
      id: p.id,
    });

    return {
      ok: true,
      requestId: request.id,
      data: mapOrderDetail({
        order,
        stateEvents: order.state_events,
        returnLogs: order.return_logs,
        webhookLogs: order.webhook_logs,
        replayRuns: order.replay_runs,
      }),
    };
  });
};
