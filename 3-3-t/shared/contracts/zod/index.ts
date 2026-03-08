import { z } from 'zod';

export const roleSchema = z.enum(['END_USER', 'ORG_ADMIN', 'PLATFORM_ADMIN']);

export const subscriptionStatusSchema = z.enum([
  'Trial',
  'Active',
  'PastDue',
  'Suspended',
  'Canceled',
  'Expired',
]);

export const invoiceStatusSchema = z.enum(['Draft', 'Open', 'Paid', 'Failed', 'Voided']);

export const errorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.any()).optional(),
  traceId: z.string(),
});

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const entitlementDecisionSchema = z.object({
  allowed: z.boolean(),
  reasonCode: z.string().optional(),
  currentUsage: z.number().optional(),
  limit: z.number().optional(),
});

export const entitlementResponseSchema = z.object({
  effectiveStatus: subscriptionStatusSchema,
  reasonCodes: z.array(z.string()).default([]),
  decisions: z.record(entitlementDecisionSchema),
  evaluatedAt: z.string(),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type EntitlementResponse = z.infer<typeof entitlementResponseSchema>;
