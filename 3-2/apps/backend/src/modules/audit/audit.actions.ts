export const AuditActions = {
  ORG_INVITE_CREATED: 'ORG_INVITE_CREATED',
  ORG_INVITE_ACCEPTED: 'ORG_INVITE_ACCEPTED',
} as const;

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions];
