import type { FastifyInstance } from 'fastify';

export function registerLogger(fastify: FastifyInstance): void {
  // Fastify already provides request-scoped logger via request.log.
  // This wrapper keeps a single place for future customization.
  fastify.log.info('Logger ready');
}
