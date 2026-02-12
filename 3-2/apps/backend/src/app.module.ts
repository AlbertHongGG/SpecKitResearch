import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { OrgsModule } from './modules/orgs/orgs.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { CsrfMiddleware } from './modules/auth/csrf.middleware.js';

@Module({
  imports: [PrismaModule, AuthModule, OrgsModule, AuditModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CsrfMiddleware).forRoutes('*');
  }
}
