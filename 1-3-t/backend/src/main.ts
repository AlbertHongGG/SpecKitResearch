import dotenv from 'dotenv';
import type { FastifyInstance, FastifyRequest } from 'fastify';

import { buildApp } from './app';

const coverageRuntimeEnabled = process.env.COVERAGE_RUNTIME === '1';

function isLocalAddress(ip: string | undefined) {
  return !ip || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

async function takeCoverageSnapshot() {
  try {
    const v8 = await import('node:v8');
    v8.takeCoverage();
  } catch {
    // Ignore environments where V8 coverage is unavailable.
  }
}

function registerCoverageShutdown(app: FastifyInstance) {
  if (!coverageRuntimeEnabled) {
    return;
  }

  app.post('/__coverage/shutdown', async (request: FastifyRequest, reply) => {
    if (!isLocalAddress(request.ip)) {
      return reply.code(403).send({ status: 'forbidden' });
    }

    reply.code(202).send({ status: 'accepted', mode: 'runtime', saved: false });

    setImmediate(async () => {
      await takeCoverageSnapshot();
      await app.close();
      process.exit(0);
    });
  });
}

async function main() {
  dotenv.config();

  const app = await buildApp();
  registerCoverageShutdown(app);

  const port = Number(process.env.PORT ?? 4000);
  const host = process.env.HOST ?? '0.0.0.0';

  await app.listen({ port, host });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
