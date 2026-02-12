import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Req, UseGuards, UsePipes } from '@nestjs/common';
import { SessionGuard } from '../common/auth/session.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { Roles } from '../common/auth/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CourseCreateRequestSchema, CourseUpdateRequestSchema } from '@app/contracts';
import { InstructorCoursesService } from './instructor-courses.service';

@Controller('instructor/courses')
@UseGuards(SessionGuard, RolesGuard)
@Roles('instructor')
export class InstructorCoursesController {
  constructor(private readonly service: InstructorCoursesService) {}

  @Get()
  async list(@Req() req: any) {
    return this.service.list({ instructorId: req.user.id });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(CourseCreateRequestSchema))
  async create(@Body() body: any, @Req() req: any) {
    return this.service.create({ instructorId: req.user.id, body });
  }

  @Patch(':courseId')
  async update(
    @Param('courseId') courseId: string,
    @Body(new ZodValidationPipe(CourseUpdateRequestSchema)) body: any,
    @Req() req: any,
  ) {
    return this.service.update({ courseId, instructorId: req.user.id, body });
  }

  @Post(':courseId/submit')
  @HttpCode(HttpStatus.OK)
  async submit(@Param('courseId') courseId: string, @Req() req: any) {
    return this.service.submit({ courseId, instructorId: req.user.id });
  }
}
