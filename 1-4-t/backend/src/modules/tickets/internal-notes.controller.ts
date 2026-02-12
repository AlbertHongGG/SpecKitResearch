import { Body, Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../common/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe'
import { ticketIdParamSchema } from './assignment.dto'
import { postInternalNoteSchema } from './messages.dto'
import { MessagesService } from './messages.service'

@Controller('tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InternalNotesController {
  constructor(private readonly messages: MessagesService) {}

  @Post(':ticketId/internal-notes')
  @HttpCode(200)
  @Roles('Agent', 'Admin')
  async postInternal(
    @CurrentUser() user: RequestUser,
    @Param(new ZodValidationPipe(ticketIdParamSchema)) params: any,
    @Body(new ZodValidationPipe(postInternalNoteSchema)) body: any,
  ) {
    return this.messages.postInternalNote({
      ticketId: params.ticketId,
      actor: { id: user.id, role: user.role },
      content: body.content,
    })
  }
}
