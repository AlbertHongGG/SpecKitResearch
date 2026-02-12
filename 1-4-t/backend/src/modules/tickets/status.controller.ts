import { Body, Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../common/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe'
import { changeStatusSchema } from './status.dto'
import { ticketIdParamSchema } from './tickets.dto'
import { StatusService } from './status.service'

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class StatusController {
  constructor(private readonly status: StatusService) {}

  @Post(':ticketId/status')
  @HttpCode(200)
  async changeStatus(
    @CurrentUser() user: RequestUser,
    @Param(new ZodValidationPipe(ticketIdParamSchema)) params: any,
    @Body(new ZodValidationPipe(changeStatusSchema)) body: any,
  ) {
    return this.status.changeStatus({
      ticketId: params.ticketId,
      actor: { id: user.id, role: user.role },
      from: body.from_status,
      to: body.to_status,
    })
  }
}
