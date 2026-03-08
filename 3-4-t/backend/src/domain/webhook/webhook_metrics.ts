import type { WebhookJob } from '@prisma/client';
import { log } from '../../lib/logger';

export function computeWebhookJobLagMs(job: Pick<WebhookJob, 'run_at'>, now: Date) {
  return Math.max(0, now.getTime() - job.run_at.getTime());
}

export function logWebhookJobClaimed(params: {
  job: Pick<WebhookJob, 'id' | 'order_id' | 'replay_run_id' | 'run_at' | 'attempt_count' | 'max_attempts'>;
  now: Date;
}) {
  log('info', 'webhook_job_claimed', {
    webhookJobId: params.job.id,
    orderId: params.job.order_id,
    replayRunId: params.job.replay_run_id ?? null,
    attemptCount: params.job.attempt_count,
    maxAttempts: params.job.max_attempts,
    lagMs: computeWebhookJobLagMs(params.job, params.now),
  });
}

export function logWebhookJobFinished(params: {
  job: Pick<WebhookJob, 'id' | 'order_id' | 'replay_run_id' | 'attempt_count'>;
  now: Date;
  ok: boolean;
  reason: string;
}) {
  log(params.ok ? 'info' : 'warn', 'webhook_job_finished', {
    webhookJobId: params.job.id,
    orderId: params.job.order_id,
    replayRunId: params.job.replay_run_id ?? null,
    attemptCount: params.job.attempt_count,
    ok: params.ok,
    reason: params.reason,
    finishedAt: params.now.toISOString(),
  });
}
