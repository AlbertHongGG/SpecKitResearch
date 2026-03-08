import type { FastifyPluginAsync } from 'fastify';
import { ErrorCode } from '@app/contracts';
import { requireAuth } from '../../middleware/authz';
import { parseParams } from '../../lib/validate';
import { WebhookJobService } from '../../domain/webhook/webhook_job_service';
import { OrderIdParamsSchema } from '../schemas/us1';

export const webhookRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/:id/webhook/resend',
    {
      preHandler: app.rateLimit({ key: 'orders.webhook_resend', limit: 20, windowMs: 60_000 }),
    },
    async (request, reply) => {
    requireAuth(request, reply);
    const p = parseParams(request, OrderIdParamsSchema);

    const order = await app.prisma.order.findUnique({ where: { id: p.id } });
    if (!order) {
      throw Object.assign(new Error('Not found'), { statusCode: 404, code: ErrorCode.NOT_FOUND });
    }
    if (request.authUser!.role !== 'ADMIN' && order.user_id !== request.authUser!.id) {
      throw Object.assign(new Error('Forbidden'), { statusCode: 403, code: ErrorCode.FORBIDDEN });
    }
    if (!order.webhook_url) {
      throw Object.assign(new Error('No webhook_url'), { statusCode: 400, code: ErrorCode.BAD_REQUEST });
    }
    if (!order.completed_at) {
      throw Object.assign(new Error('Order not completed'), { statusCode: 409, code: ErrorCode.CONFLICT });
    }

    const jobs = new WebhookJobService(app.prisma);
    const delaySec = order.webhook_delay_sec ?? 0;
    const job = await jobs.enqueue({
      orderId: order.id,
      runAt: new Date(Date.now() + delaySec * 1000),
    });

    return {
      ok: true,
      requestId: request.id,
      data: { enqueued: true, job_id: job.id },
    };
    },
  );
};
