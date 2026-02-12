import { Module } from '@nestjs/common';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { LeaveTypesModule } from './leave-types/leave-types.module';
import { LeaveBalancesModule } from './leave-balances/leave-balances.module';
import { LeaveRequestsModule } from './leave-requests/leave-requests.module';
import { ManagerModule } from './manager/manager.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { CalendarModule } from './calendar/calendar.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    LeaveTypesModule,
    LeaveBalancesModule,
    LeaveRequestsModule,
    ManagerModule,
    AttachmentsModule,
    CalendarModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
