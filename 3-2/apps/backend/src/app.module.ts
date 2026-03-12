import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { OrgsModule } from './modules/orgs/orgs.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { CsrfMiddleware } from './modules/auth/csrf.middleware.js';
import { NavModule } from './modules/nav/nav.module.js';
import { IssuesModule } from './modules/issues/issues.module.js';
import { WorkflowsModule } from './modules/workflows/workflows.module.js';
import { SprintsModule } from './modules/sprints/sprints.module.js';
import { PlatformModule } from './modules/platform/platform.module.js';
import { ProjectsModule } from './modules/projects/projects.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    OrgsModule,
    AuditModule,
    NavModule,
    WorkflowsModule,
    IssuesModule,
    SprintsModule,
    ProjectsModule,
    PlatformModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CsrfMiddleware).forRoutes('*');
  }
}
