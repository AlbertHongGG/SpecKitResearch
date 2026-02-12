import { Module } from '@nestjs/common';
import { MyCoursesController } from './my-courses.controller';
import { MyCoursesService } from './my-courses.service';
import { ProgressModule } from '../progress/progress.module';

@Module({
  imports: [ProgressModule],
  controllers: [MyCoursesController],
  providers: [MyCoursesService],
})
export class MyCoursesModule {}
