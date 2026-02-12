import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';

export const loggerPlugin: FastifyPluginAsync = fp(async (app) => {
    app.addHook('onRequest', async (request, reply) => {
        reply.header('x-request-id', request.id);
        request.log.info({ req: { method: request.method, url: request.url } }, 'request');
    });

    app.addHook('onResponse', async (request, reply) => {
        request.log.info(
            { res: { statusCode: reply.statusCode }, responseTimeMs: reply.elapsedTime },
            'response',
        );
    });
});

export default loggerPlugin;
