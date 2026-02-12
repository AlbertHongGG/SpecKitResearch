import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CsrfService } from './csrf.service';
import { createSessionMiddleware } from './session.config';
import { OwnerGuard } from './owner.guard';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [AuthService, CsrfService, OwnerGuard],
  exports: [CsrfService, OwnerGuard],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(createSessionMiddleware())
      .forRoutes('*');
  }
}

