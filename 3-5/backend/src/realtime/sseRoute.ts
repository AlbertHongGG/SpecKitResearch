import type { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../api/middleware/requireAuth.js';
import { requireProjectRole } from '../api/middleware/requireProjectRole.js';
import { backfill, subscribe } from './bus.js';
import { heartbeat, serializeSseEvent } from './events.js';

export const sseRoutePlugin: FastifyPluginAsync = async (app) => {
    app.get(
        '/projects/:projectId/events',
        {
            preHandler: [requireAuth, requireProjectRole('viewer')],
        },
        async (request, reply) => {
            const projectId = (request.params as { projectId: string }).projectId;
            const after = (request.query as { after?: string }).after ?? request.headers['last-event-id'];
            const afterId = typeof after === 'string' ? after : undefined;

            reply.raw.writeHead(200, {
                'Content-Type': 'text/event-stream; charset=utf-8',
                'Cache-Control': 'no-cache, no-transform',
                Connection: 'keep-alive',
            });

            reply.raw.write(heartbeat());

            for (const event of backfill(projectId, afterId)) {
                reply.raw.write(serializeSseEvent(event));
            }

            const unsubscribe = subscribe(projectId, {
                write: (chunk) => reply.raw.write(chunk),
                close: () => reply.raw.end(),
            });

            const interval = setInterval(() => {
                reply.raw.write(heartbeat());
            }, 15000);

            request.raw.on('close', () => {
                clearInterval(interval);
                unsubscribe();
            });

            return reply;
        },
    );
};

export default sseRoutePlugin;
