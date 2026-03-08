import type { FastifyBaseLogger } from 'fastify';
import { loadConfig } from '../lib/config.js';
import { lockDueJobs, markJobResult } from '../repositories/webhookJobRepo.js';
import { getPrisma } from '../lib/db.js';
import { getSigningSecretForEndpoint } from '../repositories/webhookEndpointRepo.js';
import { signRawBody } from '../lib/webhook/signing.js';
import { postJsonWithTimeout } from '../lib/http/client.js';
import { appendWebhookLog } from '../repositories/webhookLogRepo.js';

export function startWebhookWorker(opts: { logger?: FastifyBaseLogger }) {
  const cfg = loadConfig();
  const logger = opts.logger;

  let running = false;

  async function tick() {
    if (running) return;
    running = true;
    try {
      const now = new Date();
      const jobs = await lockDueJobs({ now, workerId: cfg.WEBHOOK_WORKER_ID, limit: 10 });
      for (const job of jobs) {
        await handleJob(job.id);
      }
    } finally {
      running = false;
    }
  }

  const interval = setInterval(() => {
    tick().catch((err) => logger?.error({ err }, 'webhook worker tick failed'));
  }, 1000);

  logger?.info({ workerId: cfg.WEBHOOK_WORKER_ID }, 'webhook worker started');

  return () => clearInterval(interval);
}

async function handleJob(jobId: string) {
  const cfg = loadConfig();
  const prisma = getPrisma();

  const job = await prisma.webhookJob.findUnique({ where: { id: jobId } });
  if (!job) return;

  const attempt = job.attemptCount + 1;

  const order = await prisma.order.findUnique({ where: { id: job.orderId } });
  if (!order) {
    await markJobResult({ jobId: job.id, status: 'dead', lastError: 'order missing', attemptCount: attempt });
    return;
  }

  if (!job.webhookEndpointId) {
    await markJobResult({ jobId: job.id, status: 'dead', lastError: 'missing webhookEndpointId', attemptCount: attempt });
    return;
  }

  const secret = await getSigningSecretForEndpoint(job.webhookEndpointId);
  if (!secret) {
    await markJobResult({ jobId: job.id, status: 'dead', lastError: 'webhook endpoint missing', attemptCount: attempt });
    return;
  }

  const payload = {
    order_no: order.orderNo,
    status: order.status,
    amount: order.amount,
    currency: order.currency,
    completed_at: order.completedAt?.toISOString() ?? null,
    error_code: order.errorCode,
    error_message: order.errorMessage,
    event_id: job.eventId,
  };

  const body = JSON.stringify(payload);
  const rawBody = Buffer.from(body, 'utf8');
  const sig = signRawBody(secret, rawBody);

  const headers = {
    'X-PaySim-Signature': sig.headerValue,
    'X-PaySim-Event-Id': job.eventId,
  };

  const result = await postJsonWithTimeout({
    url: job.url,
    body,
    headers,
    timeoutMs: cfg.WEBHOOK_TIMEOUT_MS,
    maxExcerptBytes: 4096,
  });

  const requestHeadersLogged: Record<string, string> = {
    'content-type': 'application/json',
    'X-PaySim-Signature': sig.headerValue,
    'X-PaySim-Event-Id': job.eventId,
  };

  const webhookLog = await appendWebhookLog({
    orderId: order.id,
    replayRunId: job.replayRunId,
    webhookEndpointId: job.webhookEndpointId,
    url: job.url,
    eventId: job.eventId,
    signatureTimestamp: sig.timestamp,
    signatureHeader: sig.headerValue,
    requestHeaders: requestHeadersLogged,
    payload,
    durationMs: result.durationMs,
    responseStatus: result.status,
    responseBodyExcerpt: result.responseBodyExcerpt,
    success: result.ok,
    errorSummary: result.errorSummary,
  });

  if (result.ok) {
    await markJobResult({ jobId: job.id, status: 'succeeded', lastError: null, attemptCount: attempt });
    return;
  }

  if (attempt >= cfg.WEBHOOK_MAX_ATTEMPTS) {
    await markJobResult({ jobId: job.id, status: 'dead', lastError: result.errorSummary, attemptCount: attempt });
    return;
  }

  const backoffSec = computeBackoffSec(attempt);
  await markJobResult({
    jobId: job.id,
    status: 'failed',
    lastError: result.errorSummary,
    attemptCount: attempt,
    runAt: new Date(Date.now() + backoffSec * 1000),
  });

  // Move back to pending so it can be picked up later.
  await prisma.webhookJob.update({
    where: { id: job.id },
    data: { status: 'pending' },
  });

  // keep webhookLogId for debugging
  void webhookLog;
}

function computeBackoffSec(attempt: number): number {
  const base = 10;
  const sec = base * Math.pow(2, Math.max(0, attempt - 1));
  return Math.min(sec, 600);
}

export async function sendWebhookOnceNow(input: {
  orderId: string;
  webhookEndpointId: string;
  url: string;
  eventId: string;
  replayRunId?: string | null;
}): Promise<{ webhookLogId: string } | null> {
  const prisma = getPrisma();
  const cfg = loadConfig();

  const order = await prisma.order.findUnique({ where: { id: input.orderId } });
  if (!order) return null;

  const secret = await getSigningSecretForEndpoint(input.webhookEndpointId);
  if (!secret) return null;

  const payload = {
    order_no: order.orderNo,
    status: order.status,
    amount: order.amount,
    currency: order.currency,
    completed_at: order.completedAt?.toISOString() ?? null,
    error_code: order.errorCode,
    error_message: order.errorMessage,
    event_id: input.eventId,
  };

  const body = JSON.stringify(payload);
  const sig = signRawBody(secret, Buffer.from(body, 'utf8'));
  const headers = {
    'X-PaySim-Signature': sig.headerValue,
    'X-PaySim-Event-Id': input.eventId,
  };

  const result = await postJsonWithTimeout({
    url: input.url,
    body,
    headers,
    timeoutMs: cfg.WEBHOOK_TIMEOUT_MS,
    maxExcerptBytes: 4096,
  });

  const log = await appendWebhookLog({
    orderId: order.id,
    replayRunId: input.replayRunId ?? null,
    webhookEndpointId: input.webhookEndpointId,
    url: input.url,
    eventId: input.eventId,
    signatureTimestamp: sig.timestamp,
    signatureHeader: sig.headerValue,
    requestHeaders: { 'content-type': 'application/json', ...headers },
    payload,
    durationMs: result.durationMs,
    responseStatus: result.status,
    responseBodyExcerpt: result.responseBodyExcerpt,
    success: result.ok,
    errorSummary: result.errorSummary,
  });

  return { webhookLogId: log.id };
}
