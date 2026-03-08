/*
  Simple gateway authorization benchmark.

  Usage:
    pnpm -C backend test:unit  # ensure deps are ready
    NODE_OPTIONS=--experimental-require-module ts-node --transpile-only tests/perf/gateway-benchmark.ts

  Notes:
  - Uses the same in-process app setup as integration tests.
  - Measures fastify.inject round-trip latency for /gateway/demo/demo/ping.
*/

import { PrismaClient } from '@prisma/client';

import { setupTestDb } from '../integration/_helpers/test-db';
import { createTestApp, injectJson, buildCookieHeader, getSetCookieHeader } from '../integration/_helpers/test-app';

async function main() {
  const db = setupTestDb();
  const prisma = new PrismaClient();
  const app = await createTestApp();

  try {
    // Ensure rate-limit policy exists.
    await prisma.rateLimitPolicy.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default', defaultPerMinute: 60_000, defaultPerHour: 1_000_000, capPerMinute: 60_000, capPerHour: 1_000_000 },
    });

    const email = `bench_${Date.now()}@example.com`;
    const password = 'password123';

    await injectJson(app, { method: 'POST', url: '/register', body: { email, password } });
    const loginRes = await injectJson(app, { method: 'POST', url: '/login', body: { email, password } });
    const cookie = buildCookieHeader(getSetCookieHeader(loginRes.headers));

    const keyRes = await injectJson(app, {
      method: 'POST',
      url: '/api-keys',
      headers: { cookie },
      body: { name: 'bench', scopes: ['demo:read'], rate_limit_per_minute: 60_000, rate_limit_per_hour: 1_000_000 },
    });

    const plaintext = keyRes.json?.api_key_plaintext as string;
    if (!plaintext) throw new Error('No plaintext key returned');

    const fastify: any = app.getHttpAdapter().getInstance();

    const warmups = 50;
    const iterations = 500;

    for (let i = 0; i < warmups; i++) {
      await fastify.inject({
        method: 'GET',
        url: '/gateway/demo/demo/ping',
        headers: { authorization: `Bearer ${plaintext}` },
      });
    }

    const t0 = performance.now();
    for (let i = 0; i < iterations; i++) {
      const res = await fastify.inject({
        method: 'GET',
        url: '/gateway/demo/demo/ping',
        headers: { authorization: `Bearer ${plaintext}` },
      });
      if (res.statusCode !== 200) throw new Error(`Unexpected status: ${res.statusCode}`);
    }
    const t1 = performance.now();

    const totalMs = t1 - t0;
    const avgMs = totalMs / iterations;

    // Rough percentiles: sample a smaller set.
    const sample = 200;
    const times: number[] = [];
    for (let i = 0; i < sample; i++) {
      const s0 = performance.now();
      const res = await fastify.inject({
        method: 'GET',
        url: '/gateway/demo/demo/ping',
        headers: { authorization: `Bearer ${plaintext}` },
      });
      const s1 = performance.now();
      if (res.statusCode !== 200) throw new Error(`Unexpected status: ${res.statusCode}`);
      times.push(s1 - s0);
    }
    times.sort((a, b) => a - b);

    const p50 = times[Math.floor(times.length * 0.5)]!;
    const p95 = times[Math.floor(times.length * 0.95)]!;

    console.log(JSON.stringify({ warmups, iterations, totalMs, avgMs, p50Ms: p50, p95Ms: p95 }, null, 2));
  } finally {
    await app.close();
    await prisma.$disconnect();
    db.cleanup();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
