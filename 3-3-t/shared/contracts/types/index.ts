export type Role = 'END_USER' | 'ORG_ADMIN' | 'PLATFORM_ADMIN';

export type SubscriptionStatus =
  | 'Trial'
  | 'Active'
  | 'PastDue'
  | 'Suspended'
  | 'Canceled'
  | 'Expired';

export type InvoiceStatus = 'Draft' | 'Open' | 'Paid' | 'Failed' | 'Voided';

export type ErrorResponse = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  traceId: string;
};
