import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LeaveTypesModule } from './leave-types/leave-types.module';
import { LeaveBalanceModule } from './leave-balance/leave-balance.module';
import { LeaveRequestsModule } from './leave-requests/leave-requests.module';
import { DepartmentCalendarModule } from './department-calendar/department-calendar.module';
import { AttachmentsModule } from './attachments/attachments.module';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    LeaveTypesModule,
    LeaveBalanceModule,
    LeaveRequestsModule,
    DepartmentCalendarModule,
    AttachmentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
