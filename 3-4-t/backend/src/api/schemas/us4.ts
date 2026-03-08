import { z } from 'zod';
import { ReturnMethodSchema, SimulationScenarioTypeSchema } from '@app/contracts';

export const AdminPaymentMethodUpsertBodySchema = z.object({
  code: z.string().min(1),
  display_name: z.string().min(1),
  enabled: z.boolean(),
  sort_order: z.number().int().min(0),
});

export const AdminScenarioTemplateUpsertBodySchema = z.object({
  type: SimulationScenarioTypeSchema,
  default_delay_sec: z.number().int().min(0),
  default_error_code: z.string().min(1).nullable().optional(),
  default_error_message: z.string().min(1).nullable().optional(),
  enabled: z.boolean(),
});

export const AdminSettingsSchema = z.object({
  session_ttl_hours: z.number().int().min(1),
  allowed_currencies: z.array(z.string().min(1)).min(1),
  default_return_method: ReturnMethodSchema,
  webhook_signing: z.object({
    active_secret_id: z.string().min(1),
    previous_secret_id: z.string().min(1).nullable().optional(),
    previous_secret_grace_period_hours: z.number().int().min(0),
  }),
});
