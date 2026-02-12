import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../common/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe'
import {
  createTicketSchema,
  listTicketsQuerySchema,
  ticketIdParamSchema,
} from './tickets.dto'
import { TicketsService } from './tickets.service'

@Controller('tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get()
  @Roles('Customer')
  async list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(listTicketsQuerySchema)) query: any,
  ) {
    return this.tickets.listForCustomer({
      customerId: user.id,
      status: query.status,
      limit: query.limit,
      offset: query.offset,
    })
  }

  @Post()
  @HttpCode(200)
  @Roles('Customer')
  async create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createTicketSchema)) body: any,
  ) {
    return this.tickets.createTicket({
      customerId: user.id,
      title: body.title,
      category: body.category,
      description: body.description,
    })
  }

  @Get(':ticketId')
  async detail(
    @CurrentUser() user: RequestUser,
    @Param(new ZodValidationPipe(ticketIdParamSchema)) params: any,
  ) {
    return this.tickets.getDetail({
      ticketId: params.ticketId,
      user: { id: user.id, role: user.role },
    })
  }
}
