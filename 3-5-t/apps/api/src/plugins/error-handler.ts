import type { FastifyPluginAsync } from 'fastify';
import { toErrorResponse } from '../http/errors';

export const errorHandlerPlugin: FastifyPluginAsync = async (app) => {
  app.setErrorHandler((err, req, reply) => {
    const requestId = (req as any).requestId as string | undefined;
    const { statusCode, body } = toErrorResponse(err, requestId);

    if (statusCode >= 500) {
      req.log.error({ err, requestId }, 'Unhandled error');
    }

    reply.status(statusCode).send(body);
  });
};
