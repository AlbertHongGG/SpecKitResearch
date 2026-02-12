import { Injectable } from '@nestjs/common';
import { TicketsService } from '../tickets/tickets.service';
import { ApiTicketStatus } from '../tickets/api-mappers';

@Injectable()
export class AgentService {
  constructor(private readonly tickets: TicketsService) {}

  async listTickets(params: {
    agentId: string;
    view: 'unassigned' | 'mine';
    status?: ApiTicketStatus;
    limit?: number;
  }) {
    return this.tickets.listForAgent(params);
  }
}
