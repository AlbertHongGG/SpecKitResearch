import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module.js';
import { CoursesModule } from './modules/courses/courses.module.js';
import { PurchasesModule } from './modules/purchases/purchases.module.js';
import { ProgressModule } from './modules/progress/progress.module.js';
import { InstructorModule } from './modules/instructor/instructor.module.js';
import { CurriculumModule } from './modules/curriculum/curriculum.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { FilesModule } from './modules/files/files.module.js';

@Module({
  imports: [
    AuthModule,
    CoursesModule,
    PurchasesModule,
    ProgressModule,
    InstructorModule,
    CurriculumModule,
    AdminModule,
    FilesModule,
  ],
})
export class AppModule {}
