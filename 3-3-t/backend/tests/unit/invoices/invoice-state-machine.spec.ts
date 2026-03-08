import { describe, expect, it } from 'vitest';
import { InvoiceStateMachineService } from '../../../src/modules/invoices/invoice-state-machine.service';

describe('InvoiceStateMachineService', () => {
  const machine = new InvoiceStateMachineService();

  it('allows Draft -> Open', () => {
    expect(machine.canTransition('Draft' as any, 'Open' as any)).toBe(true);
  });

  it('blocks Paid -> Open', () => {
    expect(machine.canTransition('Paid' as any, 'Open' as any)).toBe(false);
  });
});
