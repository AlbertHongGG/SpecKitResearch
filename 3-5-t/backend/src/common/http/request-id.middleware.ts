import { randomUUID } from 'node:crypto';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

export function registerRequestIdHook(app: NestFastifyApplication) {
  const fastify = app.getHttpAdapter().getInstance();
  fastify.addHook('onRequest', (req: any, reply: any, done: any) => {
    const incoming = req.headers['x-request-id'];
    req.id = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();
    reply.header('x-request-id', req.id);
    done();
  });
}
