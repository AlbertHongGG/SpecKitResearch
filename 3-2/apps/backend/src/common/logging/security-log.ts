import { logger } from './logger.js';

export function logAuthzDenied(input: {
  requestId?: string;
  userId?: string;
  reason: 'not_logged_in' | 'not_member' | 'insufficient_role' | 'read_only';
  orgId?: string;
  projectId?: string;
  route?: string;
}) {
  logger.warn('authz_denied', {
    requestId: input.requestId,
    userId: input.userId,
    orgId: input.orgId,
    projectId: input.projectId,
    reason: input.reason,
    route: input.route,
  });
}
