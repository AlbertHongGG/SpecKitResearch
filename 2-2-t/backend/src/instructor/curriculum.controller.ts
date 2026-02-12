import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../common/auth/session.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { Roles } from '../common/auth/roles.decorator';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurriculumService } from './curriculum.service';

const CreateSectionSchema = z.object({ title: z.string().min(1) });
const UpdateTitleSchema = z.object({ title: z.string().min(1) });
const ReorderSchema = z.object({ ids: z.array(z.string()).min(1) });

const CreateLessonSchema = z.object({
  title: z.string().min(1),
  contentType: z.enum(['text', 'image', 'pdf']),
  contentText: z.string().nullable().optional(),
  contentImageUrl: z.string().url().nullable().optional(),
  contentFileId: z.string().nullable().optional(),
});

@Controller('instructor')
@UseGuards(SessionGuard, RolesGuard)
@Roles('instructor')
export class CurriculumController {
  constructor(private readonly service: CurriculumService) {}

  @Get('courses/:courseId/curriculum')
  async get(@Param('courseId') courseId: string, @Req() req: any) {
    return this.service.getCurriculum({ courseId, instructorId: req.user.id });
  }

  @Post('courses/:courseId/sections')
  async createSection(
    @Param('courseId') courseId: string,
    @Body(new ZodValidationPipe(CreateSectionSchema)) body: any,
    @Req() req: any,
  ) {
    return this.service.createSection({ courseId, instructorId: req.user.id, title: body.title });
  }

  @Patch('sections/:sectionId')
  async updateSection(
    @Param('sectionId') sectionId: string,
    @Body(new ZodValidationPipe(UpdateTitleSchema)) body: any,
    @Req() req: any,
  ) {
    return this.service.updateSection({ sectionId, instructorId: req.user.id, title: body.title });
  }

  @Delete('sections/:sectionId')
  async deleteSection(@Param('sectionId') sectionId: string, @Req() req: any) {
    return this.service.deleteSection({ sectionId, instructorId: req.user.id });
  }

  @Post('courses/:courseId/sections/reorder')
  @HttpCode(HttpStatus.OK)
  async reorderSections(
    @Param('courseId') courseId: string,
    @Body(new ZodValidationPipe(ReorderSchema)) body: any,
    @Req() req: any,
  ) {
    return this.service.reorderSections({ courseId, instructorId: req.user.id, ids: body.ids });
  }

  @Post('sections/:sectionId/lessons')
  async createLesson(
    @Param('sectionId') sectionId: string,
    @Body(new ZodValidationPipe(CreateLessonSchema)) body: any,
    @Req() req: any,
  ) {
    return this.service.createLesson({ sectionId, instructorId: req.user.id, body });
  }

  @Patch('lessons/:lessonId')
  async updateLesson(
    @Param('lessonId') lessonId: string,
    @Body(new ZodValidationPipe(CreateLessonSchema.partial())) body: any,
    @Req() req: any,
  ) {
    return this.service.updateLesson({ lessonId, instructorId: req.user.id, body });
  }

  @Delete('lessons/:lessonId')
  async deleteLesson(@Param('lessonId') lessonId: string, @Req() req: any) {
    return this.service.deleteLesson({ lessonId, instructorId: req.user.id });
  }

  @Post('sections/:sectionId/lessons/reorder')
  @HttpCode(HttpStatus.OK)
  async reorderLessons(
    @Param('sectionId') sectionId: string,
    @Body(new ZodValidationPipe(ReorderSchema)) body: any,
    @Req() req: any,
  ) {
    return this.service.reorderLessons({ sectionId, instructorId: req.user.id, ids: body.ids });
  }
}
