import type { FastifyInstance } from 'fastify';

export async function createTestApp(): Promise<FastifyInstance> {
  const { buildApp } = await import('../src/app.js');
  const app = await buildApp();
  await app.ready();
  return app;
}
