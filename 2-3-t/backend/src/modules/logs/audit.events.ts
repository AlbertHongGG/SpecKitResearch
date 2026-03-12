export type AuditEvent = {
  eventId: string;
  requestId?: string;
  actorUserId?: string;
  actorRole?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  success: boolean;
  metadata?: any;
};
