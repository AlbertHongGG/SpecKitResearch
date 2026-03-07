import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OwnershipService } from './ownership/ownership.service';
import { SessionMiddleware } from './session/session.middleware';
import { SessionService } from './session/session.service';
import { SessionStore } from './session/session.store';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [SessionStore, SessionService, OwnershipService, AuthService],
  exports: [SessionService, OwnershipService, AuthService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionMiddleware).forRoutes('*');
  }
}
