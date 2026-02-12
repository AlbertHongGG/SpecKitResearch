import { z } from 'zod';
import {
  DocumentStatusSchema,
  IsoDateTimeSchema,
  ReviewModeSchema,
  ReviewTaskStatusSchema,
  UuidSchema,
} from './common.js';

export const DocumentListItemSchema = z.object({
  id: UuidSchema,
  title: z.string(),
  status: DocumentStatusSchema,
  updatedAt: IsoDateTimeSchema,
});
export type DocumentListItem = z.infer<typeof DocumentListItemSchema>;

export const ListDocumentsResponseSchema = z.object({
  documents: z.array(DocumentListItemSchema),
});
export type ListDocumentsResponse = z.infer<typeof ListDocumentsResponseSchema>;

export const CreateDraftRequestSchema = z.object({
  title: z.string().min(1).max(120),
});
export type CreateDraftRequest = z.infer<typeof CreateDraftRequestSchema>;

export const CreateDraftResponseSchema = z.object({
  documentId: UuidSchema,
});
export type CreateDraftResponse = z.infer<typeof CreateDraftResponseSchema>;

export const UpdateDraftRequestSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  content: z.string().min(0).optional(),
});
export type UpdateDraftRequest = z.infer<typeof UpdateDraftRequestSchema>;

export const AttachmentSchema = z.object({
  id: UuidSchema,
  filename: z.string(),
  contentType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  createdAt: IsoDateTimeSchema,
});
export type Attachment = z.infer<typeof AttachmentSchema>;

export const ReviewTaskSchema = z.object({
  id: UuidSchema,
  assigneeId: UuidSchema,
  stepKey: z.string(),
  mode: ReviewModeSchema,
  status: ReviewTaskStatusSchema,
  createdAt: IsoDateTimeSchema,
  actedAt: IsoDateTimeSchema.optional(),
});
export type ReviewTask = z.infer<typeof ReviewTaskSchema>;

export const ApprovalRecordSchema = z.object({
  id: UuidSchema,
  reviewTaskId: UuidSchema,
  actorId: UuidSchema,
  action: z.enum(['Approved', 'Rejected']),
  reason: z.string().optional(),
  createdAt: IsoDateTimeSchema,
});
export type ApprovalRecord = z.infer<typeof ApprovalRecordSchema>;

export const AuditLogSchema = z.object({
  id: UuidSchema,
  actorId: UuidSchema,
  action: z.string(),
  entityType: z.string(),
  entityId: UuidSchema,
  createdAt: IsoDateTimeSchema,
  metadataJson: z.string(),
});
export type AuditLog = z.infer<typeof AuditLogSchema>;

export const DocumentDetailResponseSchema = z.object({
  document: z.object({
    id: UuidSchema,
    title: z.string(),
    status: DocumentStatusSchema,
    ownerId: UuidSchema,
    currentVersion: z.object({
      id: UuidSchema,
      versionNo: z.number().int().positive(),
      content: z.string(),
      createdAt: IsoDateTimeSchema,
    }),
    attachments: z.array(AttachmentSchema),
    reviewTasks: z.array(ReviewTaskSchema),
    approvalRecords: z.array(ApprovalRecordSchema),
    auditLogs: z.array(AuditLogSchema),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  }),
});
export type DocumentDetailResponse = z.infer<typeof DocumentDetailResponseSchema>;

export const SubmitForApprovalRequestSchema = z.object({
  templateId: UuidSchema,
});
export type SubmitForApprovalRequest = z.infer<typeof SubmitForApprovalRequestSchema>;

export const ReopenAsDraftRequestSchema = z.object({});
export type ReopenAsDraftRequest = z.infer<typeof ReopenAsDraftRequestSchema>;

export const ArchiveDocumentRequestSchema = z.object({});
export type ArchiveDocumentRequest = z.infer<typeof ArchiveDocumentRequestSchema>;
