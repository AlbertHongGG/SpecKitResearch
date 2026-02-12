import type { ErrorCode } from '../lib/httpError.js';

export type AuditEntityType =
  | 'Document'
  | 'DocumentVersion'
  | 'Attachment'
  | 'ReviewTask'
  | 'ApprovalFlowTemplate'
  | 'ApprovalRecord';

export type AuditEvent = {
  actorId: string;
  action: string;
  entityType: AuditEntityType;
  entityId: string;
  requestId: string;
  metadata: Record<string, unknown>;
};

export function buildAuditEvent(base: {
  actorId: string;
  requestId: string;
  action: string;
  entityType: AuditEntityType;
  entityId: string;
  metadata?: Record<string, unknown>;
}): AuditEvent {
  return {
    actorId: base.actorId,
    requestId: base.requestId,
    action: base.action,
    entityType: base.entityType,
    entityId: base.entityId,
    metadata: base.metadata ?? {},
  };
}

export function auditMetadataForError(err: { code?: ErrorCode; message?: string }) {
  return {
    error: {
      code: err.code,
      message: err.message,
    },
  };
}

export const AuditActions = {
  DocumentCreated: 'document.created',
  DraftUpdated: 'document.draft.updated',
  DraftAttachmentUploaded: 'document.draft.attachment.uploaded',
  DocumentSubmitted: 'document.submitted',
  ReviewTaskActed: 'review.task.acted',
  FlowUpserted: 'flow.upserted',
  FlowDeactivated: 'flow.deactivated',
  DocumentArchived: 'document.archived',
} as const;
