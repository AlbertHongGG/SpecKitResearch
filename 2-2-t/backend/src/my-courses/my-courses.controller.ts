import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../common/auth/session.guard';
import { MyCoursesService } from './my-courses.service';

@Controller('my-courses')
@UseGuards(SessionGuard)
export class MyCoursesController {
  constructor(private readonly service: MyCoursesService) {}

  @Get()
  async list(@Req() req: any) {
    return this.service.listMyCourses(req.user.id);
  }

  @Get(':courseId')
  async reader(@Param('courseId') courseId: string, @Query('lessonId') lessonId: string | undefined, @Req() req: any) {
    return this.service.getReader({ userId: req.user.id, userRole: req.user.role, courseId, lessonId });
  }
}
