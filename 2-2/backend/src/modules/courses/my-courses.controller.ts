import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { MyCoursesService } from './my-courses.service.js';

@Controller('my-courses')
export class MyCoursesController {
  constructor(private readonly myCourses: MyCoursesService) {}

  @Get()
  async list(@Req() req: Request) {
    return { items: await this.myCourses.listMyCourses(req.user!.id) };
  }
}
