import { config as loadEnv } from 'dotenv';
import { buildApp } from './app.js';

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

function registerCoverageShutdown(app: Awaited<ReturnType<typeof buildApp>>) {
  if (!coverageRuntimeEnabled) {
    return;
  }

  app.post('/__coverage/shutdown', async (request, reply) => {
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

// Load backend/.env regardless of current working directory.
loadEnv({ path: new URL('../.env', import.meta.url) });

const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? '0.0.0.0';

async function main() {
  const app = await buildApp();
  registerCoverageShutdown(app);
  await app.listen({ port: PORT, host: HOST });
  app.log.info({ port: PORT }, 'Server listening');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
