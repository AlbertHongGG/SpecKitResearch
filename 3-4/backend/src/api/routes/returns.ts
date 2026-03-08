import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ackReturn, markReturnClientSignal } from '../../repositories/returnLogRepo.js';
import { notFound } from '../errors.js';
import { requireAuth } from '../plugins/requireAuth.js';

export const returnsRoutes: FastifyPluginAsync = async (app) => {
  app.post('/:return_log_id/ack', async (request) => {
    const params = z.object({ return_log_id: z.string().uuid() }).parse(request.params);
    try {
      await ackReturn(params.return_log_id);
    } catch {
      throw notFound();
    }
    return { ok: true };
  });

  app.post('/:return_log_id/client-signal', async (request) => {
    requireAuth(request);
    const params = z.object({ return_log_id: z.string().uuid() }).parse(request.params);
    try {
      await markReturnClientSignal(params.return_log_id);
    } catch {
      throw notFound();
    }
    return { ok: true };
  });
};
