import { Injectable } from '@nestjs/common';

type InvoiceStatus = 'Draft' | 'Open' | 'Paid' | 'Failed' | 'Voided';

@Injectable()
export class InvoiceStateMachineService {
  canTransition(from: InvoiceStatus, to: InvoiceStatus) {
    const allowed: Record<InvoiceStatus, InvoiceStatus[]> = {
      Draft: ['Open', 'Voided'],
      Open: ['Paid', 'Failed', 'Voided'],
      Paid: [],
      Failed: [],
      Voided: [],
    };
    return allowed[from].includes(to);
  }
}
