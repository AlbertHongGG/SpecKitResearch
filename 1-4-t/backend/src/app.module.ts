import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, AuditModule, TicketsModule, DashboardModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
