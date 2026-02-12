import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CoursesModule } from './courses/courses.module';
import { PurchasesModule } from './purchases/purchases.module';
import { MyCoursesModule } from './my-courses/my-courses.module';
import { ProgressModule } from './progress/progress.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { InstructorModule } from './instructor/instructor.module';
import { AdminModule } from './admin/admin.module';
import { TaxonomyModule } from './taxonomy/taxonomy.module';
import { StatsModule } from './stats/stats.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AppConfigModule,
    PrismaModule,
    AuthModule,
    CoursesModule,
    PurchasesModule,
    MyCoursesModule,
    ProgressModule,
    AttachmentsModule,
    InstructorModule,
    AdminModule,
    TaxonomyModule,
    StatsModule,
  ],
})
export class AppModule {}
