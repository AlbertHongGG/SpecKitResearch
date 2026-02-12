import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TicketsModule } from '../tickets/tickets.module';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';

@Module({
  imports: [AuthModule, TicketsModule],
  controllers: [AgentController],
  providers: [AgentService],
})
export class AgentModule {}
