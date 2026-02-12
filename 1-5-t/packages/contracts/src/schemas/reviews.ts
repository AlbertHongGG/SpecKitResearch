import { z } from 'zod';
import { IsoDateTimeSchema, ReviewModeSchema, ReviewTaskStatusSchema, UuidSchema } from './common.js';

export const ReviewTaskListItemSchema = z.object({
  id: UuidSchema,
  documentId: UuidSchema,
  documentTitle: z.string(),
  stepKey: z.string(),
  mode: ReviewModeSchema,
  status: ReviewTaskStatusSchema,
  createdAt: IsoDateTimeSchema,
});
export type ReviewTaskListItem = z.infer<typeof ReviewTaskListItemSchema>;

export const ListMyPendingTasksResponseSchema = z.object({
  tasks: z.array(ReviewTaskListItemSchema),
});
export type ListMyPendingTasksResponse = z.infer<typeof ListMyPendingTasksResponseSchema>;

export const RejectTaskRequestSchema = z.object({
  reason: z.string().min(1).max(2000),
});
export type RejectTaskRequest = z.infer<typeof RejectTaskRequestSchema>;

export const ActTaskResponseSchema = z.object({
  ok: z.literal(true),
});
export type ActTaskResponse = z.infer<typeof ActTaskResponseSchema>;
