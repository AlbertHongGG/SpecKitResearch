import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../common/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe'
import { agentWorkspaceQuerySchema } from './agent-workspace.dto'
import { AgentWorkspaceService } from './agent-workspace.service'

@Controller('agent/tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgentWorkspaceController {
  constructor(private readonly workspace: AgentWorkspaceService) {}

  @Get()
  @Roles('Agent', 'Admin')
  async list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(agentWorkspaceQuerySchema)) query: any,
  ) {
    return this.workspace.list({
      actor: { id: user.id, role: user.role },
      view: query.view,
      status: query.status,
      limit: query.limit,
      offset: query.offset,
    })
  }
}
