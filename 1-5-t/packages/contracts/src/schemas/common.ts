import { z } from 'zod';

export const RoleSchema = z.enum(['User', 'Reviewer', 'Admin']);
export type Role = z.infer<typeof RoleSchema>;

export const DocumentStatusSchema = z.enum([
  'Draft',
  'Submitted',
  'InReview',
  'Rejected',
  'Approved',
  'Archived',
]);
export type DocumentStatus = z.infer<typeof DocumentStatusSchema>;

export const ReviewTaskStatusSchema = z.enum(['Pending', 'Approved', 'Rejected', 'Cancelled']);
export type ReviewTaskStatus = z.infer<typeof ReviewTaskStatusSchema>;

export const ReviewModeSchema = z.enum(['Serial', 'Parallel']);
export type ReviewMode = z.infer<typeof ReviewModeSchema>;

export const UuidSchema = z.string().uuid();

export const IsoDateTimeSchema = z.string().datetime({ offset: true });
