import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { OwnershipService } from './ownership/ownership.service';
import { SessionMiddleware } from './session/session.middleware';
import { SessionService } from './session/session.service';
import { SessionStore } from './session/session.store';

@Module({
  imports: [PrismaModule],
  providers: [SessionStore, SessionService, OwnershipService],
  exports: [SessionService, OwnershipService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionMiddleware).forRoutes('*');
  }
}
