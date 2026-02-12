import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import { AgentService } from './agent.service';

const ViewSchema = z.enum(['unassigned', 'mine']);
const StatusSchema = z.enum([
  'Open',
  'In Progress',
  'Waiting for Customer',
  'Resolved',
  'Closed',
]);

const AgentTicketsQuerySchema = z
  .object({
    view: ViewSchema,
    status: StatusSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('agent')
export class AgentController {
  constructor(private readonly agent: AgentService) {}

  @Roles('Agent', 'Admin')
  @Get('tickets')
  async list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(AgentTicketsQuerySchema))
    query: z.infer<typeof AgentTicketsQuerySchema>,
  ) {
    return this.agent.listTickets({
      agentId: user.id,
      view: query.view,
      status: query.status,
      limit: query.limit,
    });
  }
}
