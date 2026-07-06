import request from 'supertest';
import { performance } from 'node:perf_hooks';

import { setupPerfApp } from './perf-helpers';
import { verifyPerfResults } from './verify-results';

async function runWithConcurrency<T, R>(params: {
  items: T[];
  concurrency: number;
  worker: (item: T, index: number) => Promise<R>;
}): Promise<R[]> {
  const results: R[] = new Array(params.items.length);
  let nextIndex = 0;

  const runWorkerLoop = async () => {
    while (true) {
      const index = nextIndex;
      nextIndex++;
      if (index >= params.items.length) return;
      results[index] = await params.worker(params.items[index], index);
    }
  };

  const lanes = Array.from({ length: Math.max(1, Math.min(params.concurrency, params.items.length)) }, () =>
    runWorkerLoop(),
  );
  await Promise.all(lanes);
  return results;
}

async function main() {
  const memberCount = Number(process.env.PERF_MEMBER_COUNT ?? '1000');
  const capacity = Number(process.env.PERF_ACTIVITY_CAPACITY ?? '50');
  const concurrency = Number(process.env.PERF_CONCURRENCY ?? '100');

  const { app, prisma, activityId, members, activityCapacity } = await setupPerfApp({
    memberCount,
    activityCapacity: capacity,
  });

  try {
    const server = app.getHttpServer();
    if (typeof (server as any).setMaxListeners === 'function') {
      (server as any).setMaxListeners(0);
    }

    const startedAt = performance.now();

    const responses = await runWithConcurrency({
      items: members,
      concurrency,
      worker: async (m) => {
        try {
          return await request(server)
            .post(`/activities/${activityId}/registrations`)
            .set('Cookie', m.cookie)
            .send({});
        } catch (e) {
          return e;
        }
      },
    });

    const elapsedMs = Math.round(performance.now() - startedAt);

    const statusCounts: Record<string, number> = {};
    for (const r of responses as any[]) {
      const status = typeof r?.status === 'number' ? String(r.status) : 'unknown';
      statusCounts[status] = (statusCounts[status] ?? 0) + 1;
    }

    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          memberCount,
          capacity: activityCapacity,
          concurrency,
          elapsedMs,
          statusCounts,
        },
        null,
        2,
      ),
    );

    const report = await verifyPerfResults({ prisma, activityId, capacity: activityCapacity });

    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          verification: {
            passed: report.passed,
            capacity: report.capacity,
            activityRegisteredCount: report.activityRegisteredCount,
            effectiveRegistrations: report.effectiveRegistrations,
            errors: report.errors,
          },
        },
        null,
        2,
      ),
    );

    if (!report.passed) {
      process.exitCode = 1;
    }
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exitCode = 1;
});
