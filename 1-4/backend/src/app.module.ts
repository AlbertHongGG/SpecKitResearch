import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { LoggingModule } from './common/logging/logging.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { TicketsModule } from './tickets/tickets.module';
import { AgentModule } from './agent/agent.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    PrismaModule,
    LoggingModule,
    UsersModule,
    AuthModule,
    AuditModule,
    TicketsModule,
    AgentModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
