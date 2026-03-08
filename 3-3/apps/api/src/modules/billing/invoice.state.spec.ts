import { transitionInvoice } from './invoice.state';

describe('invoice.state', () => {
  it('moves Draft -> Open', () => {
    const next = transitionInvoice({ status: 'Draft' }, { type: 'OPEN' });
    expect(next.status).toBe('Open');
  });

  it('moves Open -> Paid on success', () => {
    const paidAt = new Date('2026-03-04T00:00:00.000Z');
    const next = transitionInvoice({ status: 'Open' }, { type: 'PAYMENT_SUCCEEDED', paidAt });
    expect(next.status).toBe('Paid');
    expect(next.paidAt?.toISOString()).toBe(paidAt.toISOString());
  });

  it('moves Open -> Failed on failure', () => {
    const failedAt = new Date('2026-03-04T00:00:00.000Z');
    const next = transitionInvoice({ status: 'Open' }, { type: 'PAYMENT_FAILED', failedAt });
    expect(next.status).toBe('Failed');
    expect(next.failedAt?.toISOString()).toBe(failedAt.toISOString());
  });

  it('keeps Paid final', () => {
    const next = transitionInvoice({ status: 'Paid', paidAt: new Date() }, { type: 'PAYMENT_FAILED', failedAt: new Date() });
    expect(next.status).toBe('Paid');
  });
});
