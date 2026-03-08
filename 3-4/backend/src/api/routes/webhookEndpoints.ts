import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../plugins/requireAuth.js';
import { listWebhookEndpointsByUser, rotateEndpointSecret } from '../../repositories/webhookEndpointRepo.js';
import { notFound } from '../errors.js';

export const webhookEndpointsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (request) => {
    const user = requireAuth(request);
    const items = await listWebhookEndpointsByUser(user.id);
    return { items };
  });

  app.post('/:endpoint_id/rotate-secret', async (request) => {
    const user = requireAuth(request);
    const params = z.object({ endpoint_id: z.string().uuid() }).parse(request.params);

    const rotated = await rotateEndpointSecret(params.endpoint_id, user.id);
    if (!rotated) throw notFound('Endpoint not found');

    return {
      ok: true,
      endpoint: rotated.endpoint,
      signing_secret_current: rotated.signingSecretCurrent,
    };
  });
};
