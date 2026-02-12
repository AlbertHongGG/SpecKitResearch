import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { PrismaService } from './shared/db/prisma.service';
import { AuthModule } from './auth/auth.module';
import { SurveysModule } from './surveys/surveys.module';
import { PublicModule } from './public/public.module';
import { ResponsesModule } from './responses/responses.module';
import { ResultsModule } from './results/results.module';
import { SessionMiddleware } from './auth/session.middleware';
import { CsrfMiddleware } from './auth/csrf.middleware';

@Module({
  imports: [AuthModule, SurveysModule, PublicModule, ResponsesModule, ResultsModule],
  providers: [PrismaService]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionMiddleware, CsrfMiddleware).forRoutes('*');
  }
}
