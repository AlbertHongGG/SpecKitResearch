import { Controller, Get, NotFoundException, Param, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { CourseRepository } from './course.repository';
import { CourseVisibilityPolicy } from './course-visibility.policy';
import { ErrorCodes, makeError } from '@app/contracts';
import { SessionGuard } from '../common/auth/session.guard';
import { OptionalSessionGuard } from '../common/auth/optional-session.guard';

@Controller('courses')
export class CoursesController {
  constructor(
    private readonly repo: CourseRepository,
    private readonly visibility: CourseVisibilityPolicy,
  ) {}

  @Get()
  async list() {
    const courses = await this.repo.listPublished();
    return {
      items: courses.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        price: c.price,
        status: c.status,
        coverImageUrl: c.coverImageUrl,
        category: c.category ? { id: c.category.id, name: c.category.name } : null,
        tags: c.courseTags.map((ct) => ({ id: ct.tag.id, name: ct.tag.name })),
        instructor: { id: c.instructor.id, email: c.instructor.email },
      })),
    };
  }

  // Optional auth for viewer flags. If no session, still returns for published.
  @Get(':courseId')
  @UseGuards(OptionalSessionGuard)
  async detail(@Param('courseId') courseId: string, @Req() req: Request & { user?: any }) {
    const viewer = req.user ?? null;

    const course = await this.repo.getCourseWithOutline(courseId);
    if (!course) {
      throw new NotFoundException(makeError(ErrorCodes.NOT_FOUND, '課程不存在或不可見'));
    }

    if (!this.visibility.canViewMarketing(course, viewer)) {
      throw new NotFoundException(makeError(ErrorCodes.NOT_FOUND, '課程不存在或不可見'));
    }

    const isAuthenticated = Boolean(viewer?.id);
    const isOwner = viewer?.id ? viewer.id === course.instructorId : false;
    const isAdmin = viewer?.role === 'admin';
    const isPurchased = viewer?.id ? await this.repo.hasPurchase({ userId: viewer.id, courseId: course.id }) : false;

    return {
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        price: course.price,
        status: course.status,
        coverImageUrl: course.coverImageUrl,
        category: course.category ? { id: course.category.id, name: course.category.name } : null,
        tags: course.courseTags.map((ct) => ({ id: ct.tag.id, name: ct.tag.name })),
        instructor: { id: course.instructor.id, email: course.instructor.email },
      },
      outline: course.sections.map((s) => ({
        sectionTitle: s.title,
        sectionOrder: s.position,
        lessons: s.lessons.map((l) => ({
          lessonId: l.id,
          lessonTitle: l.title,
          lessonOrder: l.position,
        })),
      })),
      viewer: { isAuthenticated, isPurchased, isOwner, isAdmin },
    };
  }

  @Get(':courseId/_viewer')
  @UseGuards(SessionGuard)
  async viewerFlags(@Param('courseId') courseId: string, @Req() req: any) {
    // helper endpoint for frontend if needed
    const course = await this.repo.getCourseWithOutline(courseId);
    if (!course || !this.visibility.canViewMarketing(course, req.user)) {
      throw new NotFoundException(makeError(ErrorCodes.NOT_FOUND, '課程不存在或不可見'));
    }
    const isOwner = req.user.id === course.instructorId;
    const isAdmin = req.user.role === 'admin';
    const isPurchased = await this.repo.hasPurchase({ userId: req.user.id, courseId: course.id });
    return { viewer: { isAuthenticated: true, isPurchased, isOwner, isAdmin } };
  }
}
