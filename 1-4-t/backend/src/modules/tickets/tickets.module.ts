import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { UsersModule } from '../users/users.module'
import { AdminAssignmentController } from './admin-assignment.controller'
import { AgentWorkspaceController } from './agent-workspace.controller'
import { AssignmentController } from './assignment.controller'
import { InternalNotesController } from './internal-notes.controller'
import { MessagesController } from './messages.controller'
import { StatusController } from './status.controller'
import { TicketsController } from './tickets.controller'
import { AdminAssignmentService } from './admin-assignment.service'
import { AgentWorkspaceService } from './agent-workspace.service'
import { AssignmentService } from './assignment.service'
import { MessagesService } from './messages.service'
import { StatusService } from './status.service'
import { TicketsService } from './tickets.service'

@Module({
  imports: [AuditModule, AuthModule, UsersModule],
  controllers: [
    TicketsController,
    MessagesController,
    StatusController,
    AgentWorkspaceController,
    AssignmentController,
    InternalNotesController,
    AdminAssignmentController,
  ],
  providers: [
    TicketsService,
    MessagesService,
    StatusService,
    AgentWorkspaceService,
    AssignmentService,
    AdminAssignmentService,
  ],
  exports: [
    TicketsService,
    MessagesService,
    StatusService,
    AgentWorkspaceService,
    AssignmentService,
    AdminAssignmentService,
  ],
})
export class TicketsModule {}
