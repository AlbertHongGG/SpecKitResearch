import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CourseStateService } from '../courses/course-state.service';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly courseState: CourseStateService,
  ) {}

  async listSubmitted() {
    const items = await this.prisma.course.findMany({
      where: { status: 'submitted' },
      include: { instructor: true },
      orderBy: { updatedAt: 'asc' },
    });

    return {
      items: items.map((c) => ({
        id: c.id,
        title: c.title,
        instructor: { id: c.instructor.id, email: c.instructor.email },
        status: c.status,
        updatedAt: c.updatedAt.toISOString(),
      })),
    };
  }

  async decide(params: { courseId: string; adminId: string; decision: 'published' | 'rejected'; reason?: string | null; note?: string | null }) {
    const updated = await this.courseState.adminReview({
      courseId: params.courseId,
      adminId: params.adminId,
      decision: params.decision,
      reason: params.reason,
      note: params.note,
    });

    return { courseId: updated.id, status: updated.status };
  }

  async getReviews(courseId: string) {
    const reviews = await this.prisma.courseReview.findMany({
      where: { courseId },
      include: { reviewer: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      items: reviews.map((r) => ({
        id: r.id,
        decision: r.decision,
        reason: r.reason,
        note: r.note,
        createdAt: r.createdAt.toISOString(),
        reviewer: { id: r.reviewer.id, email: r.reviewer.email },
      })),
    };
  }
}
