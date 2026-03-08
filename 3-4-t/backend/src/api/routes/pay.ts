import type { FastifyPluginAsync } from 'fastify';
import { ErrorCode } from '@app/contracts';
import { requireAuth } from '../../middleware/authz';
import { parseBody, parseParams } from '../../lib/validate';
import { PayPageService } from '../../domain/pay/pay_page_service';
import { mapOrderDetail } from '../mappers/order_mapper';
import { OrderNoParamsSchema, PayPagePayBodySchema } from '../schemas/us1';

export const payRoutes: FastifyPluginAsync = async (app) => {
  const service = new PayPageService(app.prisma);

  app.get('/:order_no', async (request, reply) => {
    requireAuth(request, reply);
    const p = parseParams(request, OrderNoParamsSchema);
    const order = await service.load({
      requester: { id: request.authUser!.id, role: request.authUser!.role },
      orderNo: p.order_no,
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

  app.post('/:order_no', async (request, reply) => {
    requireAuth(request, reply);
    const p = parseParams(request, OrderNoParamsSchema);
    const body = parseBody(request, PayPagePayBodySchema);
    if (!body.confirm) {
      throw Object.assign(new Error('confirm required'), { statusCode: 400, code: ErrorCode.BAD_REQUEST });
    }
    const result = await service.pay({
      requester: { id: request.authUser!.id, role: request.authUser!.role },
      orderNo: p.order_no,
    });
    return {
      ok: true,
      requestId: request.id,
      data: {
        order: mapOrderDetail({
          order: result.order,
          stateEvents: result.order.state_events,
          returnLogs: result.order.return_logs,
          webhookLogs: result.order.webhook_logs,
          replayRuns: result.order.replay_runs,
        }),
        return_dispatch: result.returnDispatch,
      },
    };
  });
};
