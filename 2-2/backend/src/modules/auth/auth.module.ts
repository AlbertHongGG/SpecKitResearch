import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from '../../repositories/prisma.service.js';
import { AuthController } from './auth.controller.js';
import { SessionService } from './session.service.js';
import { SessionMiddleware } from './session.middleware.js';
import { AuthGuard } from './auth.guard.js';
import { RolesGuard } from './roles.guard.js';

@Module({
  controllers: [AuthController],
  providers: [
    PrismaService,
    SessionService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [PrismaService, SessionService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionMiddleware).forRoutes('*');
  }
}
