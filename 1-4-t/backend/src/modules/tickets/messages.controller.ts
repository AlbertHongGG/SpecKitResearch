import { Body, Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../common/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe'
import { postMessageSchema } from './messages.dto'
import { ticketIdParamSchema } from './tickets.dto'
import { MessagesService } from './messages.service'

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Post(':ticketId/messages')
  @HttpCode(200)
  async postMessage(
    @CurrentUser() user: RequestUser,
    @Param(new ZodValidationPipe(ticketIdParamSchema)) params: any,
    @Body(new ZodValidationPipe(postMessageSchema)) body: any,
  ) {
    return this.messages.postPublicMessage({
      ticketId: params.ticketId,
      actor: { id: user.id, role: user.role },
      content: body.content,
    })
  }
}
