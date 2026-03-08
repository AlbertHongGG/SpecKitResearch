import { z } from 'zod';
import {
  OrderStatusSchema,
  ReturnMethodSchema,
  SimulationScenarioTypeSchema,
  ReplayScopeSchema,
  ActorTypeSchema,
} from './enums';
import { IsoDateTimeSchema } from './datetime';

export const OrdersCreateRequestSchema = z.object({
  amount: z.number().int().positive(),
  currency: z.string().min(1).default('TWD').optional(),
  callback_url: z.string().url(),
  webhook_url: z.string().url().nullable().optional(),
  payment_method_code: z.string().min(1),
  simulation_scenario_type: SimulationScenarioTypeSchema,
  delay_sec: z.number().int().min(0).optional(),
  webhook_delay_sec: z.number().int().min(0).nullable().optional(),
  error_code: z.string().nullable().optional(),
  error_message: z.string().nullable().optional(),
  return_method: ReturnMethodSchema.optional(),
});

export type OrdersCreateRequest = z.infer<typeof OrdersCreateRequestSchema>;

export const OrderSummarySchema = z.object({
  id: z.string(),
  order_no: z.string(),
  amount: z.number().int(),
  currency: z.string(),
  status: OrderStatusSchema,
  payment_method: z.string(),
  simulation_scenario: SimulationScenarioTypeSchema,
  created_at: IsoDateTimeSchema,
  completed_at: IsoDateTimeSchema.nullable().optional(),
});

export type OrderSummary = z.infer<typeof OrderSummarySchema>;

export const ReturnPayloadSchema = z.object({
  order_no: z.string(),
  status: OrderStatusSchema,
  amount: z.number().int(),
  currency: z.string(),
  completed_at: IsoDateTimeSchema,
  error_code: z.string().nullable().optional(),
  error_message: z.string().nullable().optional(),
});

export type ReturnPayload = z.infer<typeof ReturnPayloadSchema>;

export const OrderStateEventSchema = z.object({
  id: z.string(),
  from: OrderStatusSchema.nullable().optional(),
  to: OrderStatusSchema,
  trigger: z.string(),
  actor_type: ActorTypeSchema,
  occurred_at: IsoDateTimeSchema,
  meta: z.unknown().nullable().optional(),
});

export type OrderStateEvent = z.infer<typeof OrderStateEventSchema>;

export const ReturnLogSchema = z.object({
  id: z.string(),
  delivery_method: ReturnMethodSchema,
  callback_url: z.string().url(),
  payload: ReturnPayloadSchema,
  dispatched_at: IsoDateTimeSchema,
  success: z.boolean(),
  error_message: z.string().nullable().optional(),
  replay_run_id: z.string().nullable().optional(),
});

export type ReturnLog = z.infer<typeof ReturnLogSchema>;

export const WebhookLogSchema = z.object({
  id: z.string(),
  request_url: z.string().url(),
  request_headers: z.record(z.string(), z.union([z.string(), z.array(z.string())]).optional()),
  payload: ReturnPayloadSchema,
  sent_at: IsoDateTimeSchema,
  success: z.boolean(),
  response_status: z.number().int().nullable().optional(),
  response_body_excerpt: z.string().nullable().optional(),
  replay_run_id: z.string().nullable().optional(),
});

export type WebhookLog = z.infer<typeof WebhookLogSchema>;

export const ReplayRunSchema = z.object({
  id: z.string(),
  scope: ReplayScopeSchema,
  started_at: IsoDateTimeSchema,
  finished_at: IsoDateTimeSchema.nullable().optional(),
  result_status: z.enum(['success', 'fail']),
});

export type ReplayRun = z.infer<typeof ReplayRunSchema>;

export const AuditLogSchema = z.object({
  id: z.string(),
  actor_type: ActorTypeSchema,
  action: z.string(),
  target_type: z.string(),
  target_id: z.string().nullable().optional(),
  occurred_at: IsoDateTimeSchema,
  meta: z.unknown().nullable().optional(),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;

export const OrderDetailSchema = OrderSummarySchema.extend({
  callback_url: z.string().url(),
  return_method: ReturnMethodSchema,
  webhook_url: z.string().url().nullable().optional(),
  delay_sec: z.number().int().min(0),
  webhook_delay_sec: z.number().int().min(0).nullable().optional(),
  error_code: z.string().nullable().optional(),
  error_message: z.string().nullable().optional(),
  state_events: z.array(OrderStateEventSchema),
  return_logs: z.array(ReturnLogSchema),
  webhook_logs: z.array(WebhookLogSchema),
  replay_runs: z.array(ReplayRunSchema),
  audit_logs: z.array(AuditLogSchema),
});

export type OrderDetail = z.infer<typeof OrderDetailSchema>;

export const OrdersCreateResponseSchema = z.object({
  order: OrderDetailSchema,
  pay_url: z.string(),
});

export const OrdersListResponseSchema = z.object({
  items: z.array(OrderSummarySchema),
  page: z.number().int(),
  page_size: z.number().int(),
  total_items: z.number().int(),
  total_pages: z.number().int(),
});

export const PayPagePayRequestSchema = z.object({
  confirm: z.boolean(),
});

export const PayPagePayResponseSchema = z.object({
  order: OrderDetailSchema,
  return_dispatch: z.object({
    method: ReturnMethodSchema,
    payload: ReturnPayloadSchema,
    callback_url: z.string().url(),
    redirect_url: z.string().url().optional(),
    form_html: z.string().optional(),
  }),
});
