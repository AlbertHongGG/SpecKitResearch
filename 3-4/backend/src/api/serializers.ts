import type { Order, OrderStateEvent, ReturnLog, WebhookLog, ReplayRun, AuditLog, PaymentMethod, SimulationScenarioTemplate, WebhookEndpoint } from '@prisma/client';

export function toOrderDto(order: Order) {
  return {
    id: order.id,
    order_no: order.orderNo,
    status: order.status,
    amount: order.amount,
    currency: order.currency,
    callback_url: order.callbackUrl,
    return_method: order.returnMethod,
    webhook_url: order.webhookUrl,
    webhook_endpoint_id: order.webhookEndpointId,
    payment_method_code: order.paymentMethodCode,
    simulation_scenario: order.simulationScenario,
    delay_sec: order.delaySec,
    webhook_delay_sec: order.webhookDelaySec,
    error_code: order.errorCode,
    error_message: order.errorMessage,
    created_at: order.createdAt.toISOString(),
    completed_at: order.completedAt?.toISOString() ?? null,
  };
}

export function toOrderStateEventDto(e: OrderStateEvent) {
  return {
    id: e.id,
    from_status: e.fromStatus,
    to_status: e.toStatus,
    trigger: e.trigger,
    actor_type: e.actorType,
    occurred_at: e.occurredAt.toISOString(),
    meta: e.meta,
  };
}

export function toReturnLogDto(r: ReturnLog) {
  return {
    id: r.id,
    replay_run_id: r.replayRunId ?? null,
    callback_url: r.callbackUrl,
    return_method: r.returnMethod,
    payload: r.payload,
    success: r.success,
    initiated_at: r.initiatedAt.toISOString(),
    client_signal_at: r.clientSignalAt?.toISOString() ?? null,
    ack_at: r.ackAt?.toISOString() ?? null,
    error_summary: r.errorSummary,
  };
}

export function toWebhookLogDto(w: WebhookLog) {
  return {
    id: w.id,
    replay_run_id: w.replayRunId ?? null,
    url: w.url,
    event_id: w.eventId,
    signature_timestamp: w.signatureTimestamp,
    signature_header: w.signatureHeader,
    payload: w.payload,
    sent_at: w.sentAt.toISOString(),
    response_status: w.responseStatus,
    response_body_excerpt: w.responseBodyExcerpt,
    success: w.success,
    error_summary: w.errorSummary,
  };
}

export function toReplayRunDto(r: ReplayRun) {
  return {
    id: r.id,
    scope: r.scope,
    started_at: r.startedAt.toISOString(),
    finished_at: r.finishedAt?.toISOString() ?? null,
    status: r.status,
  };
}

export function toAuditLogDto(a: AuditLog) {
  return {
    id: a.id,
    action: a.action,
    created_at: a.createdAt.toISOString(),
    meta: a.meta,
  };
}

export function toPaymentMethodDto(pm: PaymentMethod) {
  return {
    id: pm.id,
    code: pm.code,
    display_name: pm.displayName,
    enabled: pm.enabled,
    sort_order: pm.sortOrder,
  };
}

export function toScenarioTemplateDto(t: SimulationScenarioTemplate) {
  return {
    id: t.id,
    scenario: t.scenario,
    enabled: t.enabled,
    default_delay_sec: t.defaultDelaySec,
    default_error_code: t.defaultErrorCode,
    default_error_message: t.defaultErrorMessage,
  };
}

export function toWebhookEndpointDto(e: WebhookEndpoint, secretMasked: string | null) {
  return {
    id: e.id,
    url: e.url,
    grace_sec: e.graceSec,
    last_rotated_at: e.lastRotatedAt?.toISOString() ?? null,
    previous_valid_until: e.previousValidUntil?.toISOString() ?? null,
    secret_masked: secretMasked,
  };
}
