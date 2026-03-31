import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'

import { AdminModule } from './admin/admin.module'
import { AuditModule } from './audit/audit.module'
import { AuthModule } from './auth/auth.module'
import { BookingsModule } from './bookings/bookings.module'
import { RequestIdMiddleware } from './common/http/request-id.middleware'
import { RequestLoggerMiddleware } from './common/logging/logger'
import { PrismaModule } from './common/db/prisma.module'
import { ProviderModule } from './provider/provider.module'
import { ServicesModule } from './services/services.module'
import { TimeslotsModule } from './timeslots/timeslots.module'
import { UsersModule } from './users/users.module'
import { AppController } from './app.controller'
import { AppService } from './app.service'

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    ServicesModule,
    TimeslotsModule,
    BookingsModule,
    ProviderModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware, RequestLoggerMiddleware).forRoutes('*')
  }
}
