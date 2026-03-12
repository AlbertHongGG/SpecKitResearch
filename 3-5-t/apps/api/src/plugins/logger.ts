import type { FastifyPluginAsync } from 'fastify';

export const loggerPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', async (req) => {
    const requestId = (req as any).requestId as string | undefined;

    // Very lightweight audit logging for WS connect attempts.
    if (req.url.startsWith('/realtime')) {
      req.log.info(
        {
          requestId,
          method: req.method,
          url: req.url,
          origin: req.headers.origin,
        },
        'WS connect attempt',
      );
    }
  });

  app.addHook('onResponse', async (req, reply) => {
    const requestId = (req as any).requestId as string | undefined;
    const statusCode = reply.statusCode;

    if (statusCode < 400) return;

    // Focus on the high-signal cases called out by the task.
    if (statusCode === 403 || statusCode === 404 || statusCode === 409 || statusCode >= 500) {
      req.log.info(
        {
          requestId,
          statusCode,
          method: req.method,
          url: req.url,
          route: (req.routeOptions as any)?.url,
        },
        'HTTP audit',
      );
    }
  });
};
