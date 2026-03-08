import { ErrorCode, type ReturnPayload } from '@app/contracts';
import type { PrismaClient } from '@prisma/client';
import { OrderRepository } from '../../infra/repos/order_repo';
import { OrderLogsRepository } from '../../infra/repos/order_logs_repo';
import { OrderStateMachineService } from '../orders/order_state_machine_service';
import { ReturnDispatchService } from '../return/return_dispatch_service';
import { ReturnLogService } from '../return/return_log_service';
import { WebhookJobService } from '../webhook/webhook_job_service';

export class PayPageService {
  private stateMachine = new OrderStateMachineService();
  private dispatch = new ReturnDispatchService();

  constructor(private prisma: PrismaClient) {}

  async load(params: { requester: { id: string; role: string }; orderNo: string }) {
    return this.prisma.$transaction(async (tx) => {
      const repo = new OrderRepository(tx);
      const logs = new OrderLogsRepository(tx);

      const order = await repo.findByOrderNo(params.orderNo);
      if (!order) {
        throw Object.assign(new Error('Not found'), { statusCode: 404, code: ErrorCode.NOT_FOUND });
      }
      if (params.requester.role !== 'ADMIN' && order.user_id !== params.requester.id) {
        throw Object.assign(new Error('Forbidden'), { statusCode: 403, code: ErrorCode.FORBIDDEN });
      }

      if (order.status === 'created') {
        this.stateMachine.assertTransition({ from: 'created', to: 'payment_pending', trigger: 'enter_payment_page' });
        await repo.updateStatus({ id: order.id, status: 'payment_pending' });
        await logs.addStateEvent({
          order_id: order.id,
          from_status: 'created',
          to_status: 'payment_pending',
          trigger: 'enter_payment_page',
          actor_type: 'user',
          actor_user_id: params.requester.id,
        });
      }

      const detail = await tx.order.findUnique({
        where: { id: order.id },
        include: {
          state_events: { orderBy: { occurred_at: 'asc' } },
          return_logs: { orderBy: { dispatched_at: 'asc' } },
          webhook_logs: { orderBy: { sent_at: 'asc' } },
          replay_runs: { orderBy: { created_at: 'desc' } },
        },
      });
      return detail!;
    });
  }

  async pay(params: { requester: { id: string; role: string }; orderNo: string }) {
    const order = await this.prisma.order.findUnique({ where: { order_no: params.orderNo } });
    if (!order) {
      throw Object.assign(new Error('Not found'), { statusCode: 404, code: ErrorCode.NOT_FOUND });
    }
    if (params.requester.role !== 'ADMIN' && order.user_id !== params.requester.id) {
      throw Object.assign(new Error('Forbidden'), { statusCode: 403, code: ErrorCode.FORBIDDEN });
    }
    if (order.status !== 'payment_pending') {
      throw Object.assign(new Error('Order not payable'), { statusCode: 409, code: ErrorCode.CONFLICT });
    }

    if (order.delay_sec > 0) {
      await sleep(order.delay_sec * 1000);
    }

    const scenario = order.simulation_scenario_type;
    const toStatus =
      scenario === 'success' || scenario === 'delayed_success'
        ? 'paid'
        : scenario === 'failed'
          ? 'failed'
          : scenario === 'cancelled'
            ? 'cancelled'
            : 'timeout';

    this.stateMachine.assertTransition({
      from: 'payment_pending',
      to: toStatus as any,
      trigger: 'pay',
    });

    const completedAt = new Date();
    const payload: ReturnPayload = {
      order_no: order.order_no,
      status: toStatus as any,
      amount: order.amount,
      currency: order.currency,
      completed_at: completedAt.toISOString(),
      error_code: order.error_code ?? null,
      error_message: order.error_message ?? null,
    };
    const method = order.return_method as 'query_string' | 'post_form';
    const dispatch = this.dispatch.buildDispatch({
      method,
      callbackUrl: order.callback_url,
      payload,
    });

    return this.prisma.$transaction(async (tx) => {
      const logs = new OrderLogsRepository(tx);
      const returnLogService = new ReturnLogService(tx);
      const webhookJobs = new WebhookJobService(tx);

      const updated = await tx.order.updateMany({
        where: { id: order.id, status: 'payment_pending' },
        data: { status: toStatus, completed_at: completedAt },
      });
      if (updated.count !== 1) {
        throw Object.assign(new Error('Order not payable'), { statusCode: 409, code: ErrorCode.CONFLICT });
      }

      await logs.addStateEvent({
        order_id: order.id,
        from_status: 'payment_pending',
        to_status: toStatus,
        trigger: 'pay',
        actor_type: 'user',
        actor_user_id: params.requester.id,
      });

      await returnLogService.record({
        orderId: order.id,
        deliveryMethod: method,
        callbackUrl: order.callback_url,
        payload,
        success: true,
      });

      if (order.webhook_url) {
        const delaySec = order.webhook_delay_sec ?? 0;
        await webhookJobs.enqueue({
          orderId: order.id,
          runAt: new Date(Date.now() + delaySec * 1000),
        });
      }

      const detail = await tx.order.findUnique({
        where: { id: order.id },
        include: {
          state_events: { orderBy: { occurred_at: 'asc' } },
          return_logs: { orderBy: { dispatched_at: 'asc' } },
          webhook_logs: { orderBy: { sent_at: 'asc' } },
          replay_runs: { orderBy: { created_at: 'desc' } },
        },
      });

      return {
        order: detail!,
        returnDispatch: {
          method,
          payload,
          callback_url: order.callback_url,
          redirect_url: (dispatch as any).redirectUrl,
          form_html: (dispatch as any).formHtml,
        },
      };
    });
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
