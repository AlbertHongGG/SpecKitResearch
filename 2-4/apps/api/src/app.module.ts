import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { ThrottleModule } from './common/throttle.module';
import { PublicModule } from './public/public.module';
import { ResponsesModule } from './responses/responses.module';
import { ResultsModule } from './results/results.module';
import { SurveysModule } from './surveys/surveys.module';

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    AuthModule,
    ThrottleModule,
    PublicModule,
    ResponsesModule,
    SurveysModule,
    ResultsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

