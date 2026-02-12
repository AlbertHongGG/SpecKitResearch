import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import { AppLogger } from '../common/logging/logger.service';
import { TicketsService } from './tickets.service';

const TicketStatusSchema = z.enum([
  'Open',
  'In Progress',
  'Waiting for Customer',
  'Resolved',
  'Closed',
]);
const TicketCategorySchema = z.enum([
  'Account',
  'Billing',
  'Technical',
  'Other',
]);

const CreateTicketSchema = z
  .object({
    title: z.string().min(1).max(100),
    category: TicketCategorySchema,
    description: z.string().min(1),
  })
  .strict();

const CreateMessageSchema = z
  .object({
    content: z.string().min(1),
    is_internal: z.boolean(),
  })
  .strict();

const ChangeStatusSchema = z
  .object({
    from_status: TicketStatusSchema,
    to_status: TicketStatusSchema,
    expected_assignee_id: z.string().uuid().nullable().optional(),
  })
  .strict();

const ChangeAssigneeSchema = z
  .object({
    assignee_id: z.string().uuid().nullable(),
    expected_status: TicketStatusSchema,
  })
  .strict();

const ListTicketsQuerySchema = z
  .object({
    status: TicketStatusSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class TicketsController {
  constructor(
    private readonly tickets: TicketsService,
    private readonly logger: AppLogger,
  ) {}

  @Roles('Customer')
  @Get('tickets')
  async listCustomerTickets(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(ListTicketsQuerySchema))
    query: z.infer<typeof ListTicketsQuerySchema>,
  ) {
    const status = query.status;
    const limit = query.limit;
    this.logger.withContext(TicketsController.name).log('tickets.list', {
      actor_id: user.id,
      role: user.role,
      status,
      limit,
    });
    return this.tickets.listForCustomer({ customerId: user.id, status, limit });
  }

  @Roles('Customer')
  @Post('tickets')
  async createTicket(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(CreateTicketSchema))
    body: z.infer<typeof CreateTicketSchema>,
  ) {
    this.logger.withContext(TicketsController.name).log('tickets.create', {
      actor_id: user.id,
      role: user.role,
      category: body.category,
    });
    return this.tickets.createTicket({
      customerId: user.id,
      title: body.title,
      category: body.category,
      description: body.description,
    });
  }

  @Get('tickets/:ticketId')
  async getTicketDetail(
    @CurrentUser() user: RequestUser,
    @Param('ticketId') ticketId: string,
  ) {
    this.logger.withContext(TicketsController.name).log('tickets.detail', {
      actor_id: user.id,
      role: user.role,
      ticket_id: ticketId,
    });
    return this.tickets.getDetail({ ticketId, user });
  }

  @Post('tickets/:ticketId/messages')
  async createMessage(
    @CurrentUser() user: RequestUser,
    @Param('ticketId') ticketId: string,
    @Body(new ZodValidationPipe(CreateMessageSchema))
    body: z.infer<typeof CreateMessageSchema>,
  ) {
    this.logger
      .withContext(TicketsController.name)
      .log('tickets.message.create', {
        actor_id: user.id,
        role: user.role,
        ticket_id: ticketId,
        is_internal: body.is_internal,
      });
    return this.tickets.addMessage({
      ticketId,
      actor: user,
      content: body.content,
      isInternal: body.is_internal,
    });
  }

  @Post('tickets/:ticketId/status')
  @HttpCode(200)
  async changeStatus(
    @CurrentUser() user: RequestUser,
    @Param('ticketId') ticketId: string,
    @Body(new ZodValidationPipe(ChangeStatusSchema))
    body: z.infer<typeof ChangeStatusSchema>,
  ) {
    this.logger
      .withContext(TicketsController.name)
      .log('tickets.status.change', {
        actor_id: user.id,
        role: user.role,
        ticket_id: ticketId,
        from_status: body.from_status,
        to_status: body.to_status,
        expected_assignee_id: body.expected_assignee_id,
      });

    if (
      user.role === 'Customer' &&
      body.from_status === 'Resolved' &&
      body.to_status === 'Closed'
    ) {
      return this.tickets.closeTicketAsCustomer({
        ticketId,
        customerId: user.id,
        expectedAssigneeId: body.expected_assignee_id,
      });
    }

    return this.tickets.changeStatus({
      ticketId,
      actor: user,
      fromStatus: body.from_status,
      toStatus: body.to_status,
      expectedAssigneeId: body.expected_assignee_id,
    });
  }

  @Post('tickets/:ticketId/assignee')
  @HttpCode(200)
  async changeAssignee(
    @CurrentUser() user: RequestUser,
    @Param('ticketId') ticketId: string,
    @Body(new ZodValidationPipe(ChangeAssigneeSchema))
    body: z.infer<typeof ChangeAssigneeSchema>,
  ) {
    this.logger
      .withContext(TicketsController.name)
      .log('tickets.assignee.change', {
        actor_id: user.id,
        role: user.role,
        ticket_id: ticketId,
        assignee_id: body.assignee_id,
        expected_status: body.expected_status,
      });
    return this.tickets.changeAssignee({
      ticketId,
      actor: user,
      assigneeId: body.assignee_id,
      expectedStatus: body.expected_status,
    });
  }
}
