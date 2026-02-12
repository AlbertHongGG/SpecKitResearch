import { z } from 'zod';
import { IsoDateTimeSchema, ReviewModeSchema, RoleSchema, UuidSchema } from './common.js';

export const FlowStepInputSchema = z.object({
  stepKey: z.string().min(1).max(64),
  orderIndex: z.number().int().nonnegative(),
  mode: ReviewModeSchema,
  assigneeIds: z.array(UuidSchema).min(1),
});
export type FlowStepInput = z.infer<typeof FlowStepInputSchema>;

export const UpsertFlowTemplateRequestSchema = z.object({
  name: z.string().min(1).max(120),
  isActive: z.boolean().default(true),
  steps: z.array(FlowStepInputSchema).min(1),
});
export type UpsertFlowTemplateRequest = z.infer<typeof UpsertFlowTemplateRequestSchema>;

export const FlowTemplateSchema = z.object({
  id: UuidSchema,
  name: z.string(),
  isActive: z.boolean(),
  steps: z.array(FlowStepInputSchema),
  updatedAt: IsoDateTimeSchema,
});
export type FlowTemplate = z.infer<typeof FlowTemplateSchema>;

export const ListFlowTemplatesResponseSchema = z.object({
  templates: z.array(FlowTemplateSchema),
});
export type ListFlowTemplatesResponse = z.infer<typeof ListFlowTemplatesResponseSchema>;

export const ListActiveFlowTemplatesResponseSchema = z.object({
  templates: z.array(
    z.object({
      id: UuidSchema,
      name: z.string(),
    }),
  ),
});
export type ListActiveFlowTemplatesResponse = z.infer<typeof ListActiveFlowTemplatesResponseSchema>;

export const DeactivateFlowTemplateResponseSchema = z.object({ ok: z.literal(true) });
export type DeactivateFlowTemplateResponse = z.infer<typeof DeactivateFlowTemplateResponseSchema>;

export const UserSummarySchema = z.object({
  id: UuidSchema,
  email: z.string().email(),
  role: RoleSchema,
});
export type UserSummary = z.infer<typeof UserSummarySchema>;

export const ListUsersQuerySchema = z.object({
  role: RoleSchema.optional(),
});
export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>;

export const ListUsersResponseSchema = z.object({
  users: z.array(UserSummarySchema),
});
export type ListUsersResponse = z.infer<typeof ListUsersResponseSchema>;
