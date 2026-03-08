import { z } from 'zod';

export const UserRoleSchema = z.enum(['USER_DEVELOPER', 'ADMIN']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const OrderStatusSchema = z.enum(['created', 'payment_pending', 'paid', 'failed', 'cancelled', 'timeout']);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const ReturnMethodSchema = z.enum(['query_string', 'post_form']);
export type ReturnMethod = z.infer<typeof ReturnMethodSchema>;

export const SimulationScenarioTypeSchema = z.enum([
  'success',
  'failed',
  'cancelled',
  'timeout',
  'delayed_success',
]);
export type SimulationScenarioType = z.infer<typeof SimulationScenarioTypeSchema>;

export const ActorTypeSchema = z.enum(['user', 'admin', 'system']);
export type ActorType = z.infer<typeof ActorTypeSchema>;

export const ReplayScopeSchema = z.enum(['webhook_only', 'full_flow']);
export type ReplayScope = z.infer<typeof ReplayScopeSchema>;
