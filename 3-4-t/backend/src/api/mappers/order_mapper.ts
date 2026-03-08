import type { Order, OrderStateEvent, ReturnLog, WebhookLog, ReplayRun } from '@prisma/client';
import type { OrderDetail, OrderSummary, ReturnPayload } from '@app/contracts';

function toIso(d: Date | null | undefined) {
  return d ? d.toISOString() : null;
}

export function mapOrderSummary(order: Order): OrderSummary {
  return {
    id: order.id,
    order_no: order.order_no,
    amount: order.amount,
    currency: order.currency,
    status: order.status as any,
    payment_method: order.payment_method_code,
    simulation_scenario: order.simulation_scenario_type as any,
    created_at: order.created_at.toISOString(),
    completed_at: toIso(order.completed_at) ?? undefined,
  };
}

export function mapOrderDetail(params: {
  order: Order;
  stateEvents: OrderStateEvent[];
  returnLogs: ReturnLog[];
  webhookLogs: WebhookLog[];
  replayRuns: ReplayRun[];
}): OrderDetail {
  return {
    ...mapOrderSummary(params.order),
    callback_url: params.order.callback_url,
    return_method: params.order.return_method as any,
    webhook_url: params.order.webhook_url ?? null,
    delay_sec: params.order.delay_sec,
    webhook_delay_sec: params.order.webhook_delay_sec ?? null,
    error_code: params.order.error_code ?? null,
    error_message: params.order.error_message ?? null,
    state_events: params.stateEvents.map((e) => ({
      id: e.id,
      from: (e.from_status as any) ?? null,
      to: e.to_status as any,
      trigger: e.trigger,
      actor_type: e.actor_type as any,
      occurred_at: e.occurred_at.toISOString(),
      meta: e.meta as any,
    })),
    return_logs: params.returnLogs.map((l) => ({
      id: l.id,
      delivery_method: l.delivery_method as any,
      callback_url: l.callback_url,
      payload: l.payload as ReturnPayload,
      dispatched_at: l.dispatched_at.toISOString(),
      success: l.success,
      error_message: l.error_message ?? null,
      replay_run_id: l.replay_run_id ?? null,
    })),
    webhook_logs: params.webhookLogs.map((l) => ({
      id: l.id,
      request_url: l.request_url,
      request_headers: l.request_headers as any,
      payload: l.payload as ReturnPayload,
      sent_at: l.sent_at.toISOString(),
      success: l.success,
      response_status: l.response_status ?? null,
      response_body_excerpt: l.response_body_excerpt ?? null,
      replay_run_id: l.replay_run_id ?? null,
    })),
    replay_runs: params.replayRuns.map((r) => ({
      id: r.id,
      scope: r.scope as any,
      started_at: r.created_at.toISOString(),
      finished_at: (r.status === 'succeeded' || r.status === 'failed') ? r.created_at.toISOString() : null,
      result_status: r.status === 'failed' ? 'fail' : 'success',
    })),
    audit_logs: [],
  };
}
