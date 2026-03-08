import type { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../middleware/authz';
import { parseBody, parseParams } from '../../lib/validate';
import { OrderIdParamsSchema } from '../schemas/us1';
import { ReplayRequestBodySchema } from '../schemas/us3';
import { ReplayService } from '../../domain/replay/replay_service';

export const replayRoutes: FastifyPluginAsync = async (app) => {
  const service = new ReplayService(app.prisma);

  app.post(
    '/:id/replay',
    {
      preHandler: app.rateLimit({ key: 'orders.replay', limit: 20, windowMs: 60_000 }),
    },
    async (request, reply) => {
    requireAuth(request, reply);
    const p = parseParams(request, OrderIdParamsSchema);
    const body = parseBody(request, ReplayRequestBodySchema);

    const run = await service.replay({
      requester: { id: request.authUser!.id, role: request.authUser!.role },
      orderId: p.id,
      scope: body.scope,
    });

    return {
      ok: true,
      requestId: request.id,
      data: {
        replay_run_id: run.id,
      },
    };
    },
  );
};
