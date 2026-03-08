import { InvoiceStatus } from '@sb/db';

export type InvoiceEvent =
  | { type: 'OPEN' }
  | { type: 'PAYMENT_SUCCEEDED'; paidAt: Date }
  | { type: 'PAYMENT_FAILED'; failedAt: Date }
  | { type: 'VOID' };

export function transitionInvoice(
  input: {
    status: InvoiceStatus;
    paidAt?: Date | null;
    failedAt?: Date | null;
  },
  event: InvoiceEvent,
): { status: InvoiceStatus; paidAt?: Date | null; failedAt?: Date | null } {
  if (input.status === 'Paid' || input.status === 'Voided') {
    return input;
  }

  switch (event.type) {
    case 'OPEN': {
      if (input.status === 'Draft') return { ...input, status: 'Open' };
      return input;
    }
    case 'PAYMENT_SUCCEEDED': {
      if (input.status === 'Open') {
        return { ...input, status: 'Paid', paidAt: event.paidAt, failedAt: null };
      }
      return input;
    }
    case 'PAYMENT_FAILED': {
      if (input.status === 'Open') {
        return { ...input, status: 'Failed', failedAt: event.failedAt };
      }
      return input;
    }
    case 'VOID': {
      if (input.status === 'Draft' || input.status === 'Open') {
        return { ...input, status: 'Voided' };
      }
      return input;
    }
  }
}
