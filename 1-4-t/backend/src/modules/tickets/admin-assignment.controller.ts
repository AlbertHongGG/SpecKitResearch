import { Body, Controller, Param, Put, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../common/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe'
import { assignTicketParamSchema, assignTicketSchema } from './admin-assignment.dto'
import { AdminAssignmentService } from './admin-assignment.service'

@Controller('admin/tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminAssignmentController {
  constructor(private readonly adminAssign: AdminAssignmentService) {}

  @Put(':ticketId/assignee')
  @Roles('Admin')
  async assign(
    @CurrentUser() user: RequestUser,
    @Param(new ZodValidationPipe(assignTicketParamSchema)) params: any,
    @Body(new ZodValidationPipe(assignTicketSchema)) body: any,
  ) {
    return this.adminAssign.assign({
      actor: { id: user.id, role: user.role },
      ticketId: params.ticketId,
      assigneeId: body.assignee_id,
    })
  }
}
