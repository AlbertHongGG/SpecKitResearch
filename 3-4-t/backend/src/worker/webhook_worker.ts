import type { PrismaClient } from '@prisma/client';
import { WebhookJobService } from '../domain/webhook/webhook_job_service';
import { logWebhookJobClaimed, logWebhookJobFinished } from '../domain/webhook/webhook_metrics';
import { WebhookPayloadBuilder } from '../domain/webhook/webhook_payload_builder';
import { WebhookSender } from '../domain/webhook/webhook_sender';
import { WebhookSignatureService } from '../domain/webhook/webhook_signature_service';

export async function runWebhookWorkerLoop(params: {
  prisma: PrismaClient;
  envSigningSecret?: string;
  pollIntervalMs?: number;
  lockTtlSec?: number;
  stopSignal?: { stopped: boolean };
}) {
  const pollIntervalMs = params.pollIntervalMs ?? 500;
  const lockTtlSec = params.lockTtlSec ?? 15;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (params.stopSignal?.stopped) return;
    const ran = await runWebhookWorkerOnce({
      prisma: params.prisma,
      envSigningSecret: params.envSigningSecret,
      lockTtlSec,
      now: new Date(),
    });
    if (!ran) {
      await sleep(pollIntervalMs);
    }
  }
}

export async function runWebhookWorkerOnce(params: {
  prisma: PrismaClient;
  envSigningSecret?: string;
  lockTtlSec: number;
  now: Date;
}) {
  const jobService = new WebhookJobService(params.prisma);
  const job = await jobService.claimNext({ now: params.now, lockTtlSec: params.lockTtlSec });
  if (!job) return false;

  logWebhookJobClaimed({ job, now: params.now });

  const order = await params.prisma.order.findUnique({ where: { id: job.order_id } });
  if (!order?.webhook_url) {
    await jobService.fail({ id: job.id, now: params.now, error: 'missing_webhook_url' });
    logWebhookJobFinished({ job, now: params.now, ok: false, reason: 'missing_webhook_url' });
    return true;
  }

  const payloadBuilder = new WebhookPayloadBuilder(params.prisma);
  const payload = await payloadBuilder.buildForOrder({ orderId: job.order_id, replayRunId: job.replay_run_id });

  const signature = new WebhookSignatureService(params.prisma, { envSigningSecret: params.envSigningSecret });
  const sender = new WebhookSender(signature, { timeoutMs: 8_000 });
  const result = await sender.send({ url: order.webhook_url, payload, now: params.now });

  if (result.ok) {
    await params.prisma.webhookLog.create({
      data: {
        order_id: job.order_id,
        replay_run_id: job.replay_run_id ?? null,
        request_url: order.webhook_url,
        request_headers: result.requestHeaders,
        payload,
        sent_at: params.now,
        response_status: result.responseStatus,
        response_body_excerpt: result.responseBodyExcerpt,
        success: result.success,
      },
    });

    if (result.success) {
      await jobService.complete({ id: job.id, now: params.now });
      logWebhookJobFinished({ job, now: params.now, ok: true, reason: 'delivered' });
    } else {
      await jobService.fail({ id: job.id, now: params.now, error: `http_${result.responseStatus}` });
      logWebhookJobFinished({ job, now: params.now, ok: false, reason: `http_${result.responseStatus}` });
    }
  } else {
    await params.prisma.webhookLog.create({
      data: {
        order_id: job.order_id,
        replay_run_id: job.replay_run_id ?? null,
        request_url: order.webhook_url,
        request_headers: result.requestHeaders,
        payload,
        sent_at: params.now,
        response_status: null,
        response_body_excerpt: result.errorMessage,
        success: false,
      },
    });
    await jobService.fail({ id: job.id, now: params.now, error: result.errorMessage });
    logWebhookJobFinished({ job, now: params.now, ok: false, reason: result.errorMessage });
  }

  return true;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
