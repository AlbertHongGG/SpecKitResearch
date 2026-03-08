export type UsageEvent = {
  requestId?: string;
  keyId?: string;
  userId?: string;
  serviceSlug?: string;
  endpointId?: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs?: number;
  outcome: string;
  errorCode?: string;
};
