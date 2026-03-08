export type ErrorResponse = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  traceId: string;
};

export const errorCode = {
  unauthorized: 'AUTH_UNAUTHORIZED',
  forbidden: 'RBAC_FORBIDDEN',
  notFound: 'RESOURCE_NOT_FOUND',
  validation: 'VALIDATION_FAILED',
  conflict: 'STATE_CONFLICT',
  throttled: 'THROTTLED',
} as const;
