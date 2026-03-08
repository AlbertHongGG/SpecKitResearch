import { buildApp } from './api/http.js';
import { loadConfig } from './lib/config.js';
import { startWebhookWorker } from './jobs/webhookWorker.js';
import { startCleanupWorker } from './jobs/cleanupWorker.js';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

async function maybeServeFrontendBuild(app: Awaited<ReturnType<typeof buildApp>>): Promise<void> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Works in both dev (backend/src) and prod (backend/dist): go to repo root then frontend/dist.
  const distDir = path.resolve(__dirname, '..', '..', 'frontend', 'dist');
  const indexPath = path.join(distDir, 'index.html');

  if (!existsSync(indexPath)) {
    app.log.info({ distDir }, 'frontend build not found; skipping static serving');
    return;
  }

  await app.register(fastifyStatic, {
    root: distDir,
    prefix: '/',
  });

  app.setNotFoundHandler((request, reply) => {
    // Keep API behavior unchanged.
    if (request.url.startsWith('/api') || request.url === '/health') {
      reply.status(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Not Found',
          request_id: (request as any).requestId as string | undefined,
        },
      });
      return;
    }

    if (request.method !== 'GET') {
      reply.status(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Not Found',
          request_id: (request as any).requestId as string | undefined,
        },
      });
      return;
    }

    const accept = request.headers.accept ?? '';
    if (!accept.includes('text/html') && !accept.includes('*/*')) {
      reply.status(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Not Found',
          request_id: (request as any).requestId as string | undefined,
        },
      });
      return;
    }

    reply.type('text/html').sendFile('index.html');
  });
}

async function main(): Promise<void> {
  const config = loadConfig();
  const app = await buildApp();

  await maybeServeFrontendBuild(app);

  const url = await app.listen({ port: config.PORT, host: '0.0.0.0' });
  app.log.info({ url }, 'server listening');

  if (config.RUN_WEBHOOK_WORKER) {
    startWebhookWorker({ logger: app.log });
  }

  if (config.RUN_CLEANUP_WORKER) {
    startCleanupWorker({ logger: app.log });
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
