import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll } from 'vitest';

import { buildApp } from '../../src/app';

export function withTestApp() {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  return {
    get app() {
      return app;
    },
  };
}
