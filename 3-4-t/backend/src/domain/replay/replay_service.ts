import { ErrorCode } from '@app/contracts';
import type { PrismaClient } from '@prisma/client';
import { WebhookPayloadBuilder } from '../webhook/webhook_payload_builder';
import { ReturnDispatchService } from '../return/return_dispatch_service';
import { ReturnLogService } from '../return/return_log_service';
import { WebhookJobService } from '../webhook/webhook_job_service';
import { ReplayRepository } from '../../infra/repos/replay_repo';

export class ReplayService {
  private dispatch = new ReturnDispatchService();

  constructor(private prisma: PrismaClient) {}

  async replay(params: {
    requester: { id: string; role: string };
    orderId: string;
    scope: 'webhook_only' | 'full_flow';
  }) {
    const order = await this.prisma.order.findUnique({ where: { id: params.orderId } });
    if (!order) {
      throw Object.assign(new Error('Not found'), { statusCode: 404, code: ErrorCode.NOT_FOUND });
    }
    if (params.requester.role !== 'ADMIN' && order.user_id !== params.requester.id) {
      throw Object.assign(new Error('Forbidden'), { statusCode: 403, code: ErrorCode.FORBIDDEN });
    }
    if (!order.completed_at) {
      throw Object.assign(new Error('Order not completed'), { statusCode: 409, code: ErrorCode.CONFLICT });
    }

    const payloadBuilder = new WebhookPayloadBuilder(this.prisma);
    const payload = await payloadBuilder.buildForOrder({ orderId: order.id, replayRunId: null });

    return this.prisma.$transaction(async (tx) => {
      const replayRepo = new ReplayRepository(tx);
      const run = await replayRepo.create({
        orderId: order.id,
        scope: params.scope,
        requestedByUserId: params.requester.id,
      });

      try {
        if (params.scope === 'full_flow') {
          const method = order.return_method as 'query_string' | 'post_form';
          // Build (not executed) to keep behavior consistent.
          this.dispatch.buildDispatch({ method, callbackUrl: order.callback_url, payload });

          const returnLog = new ReturnLogService(tx);
          await returnLog.record({
            orderId: order.id,
            replayRunId: run.id,
            deliveryMethod: method,
            callbackUrl: order.callback_url,
            payload,
            success: true,
          });
        }

        if (order.webhook_url) {
          const jobs = new WebhookJobService(tx);
          const delaySec = order.webhook_delay_sec ?? 0;
          await jobs.enqueue({
            orderId: order.id,
            replayRunId: run.id,
            runAt: new Date(Date.now() + delaySec * 1000),
          });
        }

        await replayRepo.markSucceeded(run.id);
      } catch (e: any) {
        await replayRepo.markFailed(run.id, e?.message ?? 'replay_failed');
        throw e;
      }

      return run;
    });
  }
}
