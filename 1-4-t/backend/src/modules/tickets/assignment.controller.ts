import { Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../common/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe'
import { ticketIdParamSchema } from './assignment.dto'
import { AssignmentService } from './assignment.service'

@Controller('tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssignmentController {
  constructor(private readonly assignment: AssignmentService) {}

  @Post(':ticketId/take')
  @HttpCode(200)
  @Roles('Agent')
  async take(
    @CurrentUser() user: RequestUser,
    @Param(new ZodValidationPipe(ticketIdParamSchema)) params: any,
  ) {
    return this.assignment.takeTicket({ ticketId: params.ticketId, actor: { id: user.id, role: user.role } })
  }

  @Post(':ticketId/cancel-take')
  @HttpCode(200)
  @Roles('Agent')
  async cancelTake(
    @CurrentUser() user: RequestUser,
    @Param(new ZodValidationPipe(ticketIdParamSchema)) params: any,
  ) {
    return this.assignment.cancelTake({ ticketId: params.ticketId, actor: { id: user.id, role: user.role } })
  }
}
