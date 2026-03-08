import { apiFetch } from './http';
import { withCsrfHeaders } from './csrf';

export type OrderStatus = 'created' | 'payment_pending' | 'paid' | 'failed' | 'cancelled' | 'timeout';

export type Order = {
  id: string;
  order_no: string;
  status: OrderStatus;
  amount: number;
  currency: string;
  callback_url: string;
  return_method: 'query_string' | 'post_form';
  webhook_url: string | null;
  webhook_endpoint_id: string | null;
  payment_method_code: string;
  simulation_scenario: 'success' | 'failed' | 'cancelled' | 'timeout' | 'delayed_success';
  delay_sec: number;
  webhook_delay_sec: number | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
};

export type ReturnLog = {
  id: string;
  replay_run_id: string | null;
  callback_url: string;
  return_method: 'query_string' | 'post_form';
  payload: any;
  success: boolean;
  initiated_at: string;
  client_signal_at: string | null;
  ack_at: string | null;
  error_summary: string | null;
};

export type WebhookLog = {
  id: string;
  replay_run_id: string | null;
  url: string;
  event_id: string;
  signature_timestamp: number;
  signature_header: string;
  payload: any;
  sent_at: string;
  response_status: number | null;
  response_body_excerpt: string | null;
  success: boolean;
  error_summary: string | null;
};

export type OrderStateEvent = {
  id: string;
  from_status: OrderStatus;
  to_status: OrderStatus;
  trigger: string;
  actor_type: 'user' | 'system' | 'admin';
  occurred_at: string;
  meta?: any;
};

export type ReplayRun = {
  id: string;
  scope: 'webhook_only' | 'full_flow';
  started_at: string;
  finished_at: string | null;
  status: 'running' | 'succeeded' | 'failed';
};

export type AuditLog = {
  id: string;
  action: string;
  created_at: string;
  meta?: any;
};

export async function createOrder(input: {
  amount: number;
  currency: string;
  callback_url: string;
  webhook_url?: string | null;
  payment_method_code: string;
  simulation_scenario: Order['simulation_scenario'];
  delay_sec?: number;
  webhook_delay_sec?: number | null;
  error_code?: string | null;
  error_message?: string | null;
}) {
  return apiFetch<{ order: Order; payment_page_url: string; webhook_endpoint_created?: any }>(`/api/orders`, {
    method: 'POST',
    headers: withCsrfHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify(input),
  });
}

export async function listOrders(params: { page?: number; status?: OrderStatus } = {}) {
  const search = new URLSearchParams();
  if (params.page) search.set('page', String(params.page));
  if (params.status) search.set('status', params.status);
  const qs = search.toString();
  return apiFetch<{ items: Order[]; page: number; page_size: number; total: number }>(`/api/orders${qs ? `?${qs}` : ''}`);
}

export async function getOrderDetail(orderNo: string) {
  return apiFetch<{
    order: Order;
    state_events: OrderStateEvent[];
    return_logs: ReturnLog[];
    webhook_logs: WebhookLog[];
    replay_runs: ReplayRun[];
    audit_logs: AuditLog[];
  }>(`/api/orders/${encodeURIComponent(orderNo)}`);
}

export async function enterPayPage(orderNo: string) {
  return apiFetch<{ ok: boolean; status: OrderStatus }>(`/api/pay/${encodeURIComponent(orderNo)}/enter`, {
    method: 'POST',
    headers: withCsrfHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({}),
  });
}

export async function simulatePay(orderNo: string) {
  return apiFetch<{ ok: boolean; order_no: string; status?: OrderStatus; completed_at?: string | null; return_dispatch_url: string }>(
    `/api/pay/${encodeURIComponent(orderNo)}/simulate`,
    {
      method: 'POST',
      headers: withCsrfHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify({}),
    },
  );
}

export async function resendWebhook(orderNo: string) {
  return apiFetch<{ ok: boolean; webhook_log_id: string }>(`/api/orders/${encodeURIComponent(orderNo)}/resend-webhook`, {
    method: 'POST',
    headers: withCsrfHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({}),
  });
}

export async function createReplay(orderNo: string, scope: 'webhook_only' | 'full_flow') {
  return apiFetch<{ ok: boolean; replay_run_id: string }>(`/api/orders/${encodeURIComponent(orderNo)}/replay`, {
    method: 'POST',
    headers: withCsrfHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({ scope }),
  });
}
