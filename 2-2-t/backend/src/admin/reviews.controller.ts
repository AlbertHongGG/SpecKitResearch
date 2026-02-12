import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Req, UseGuards, UsePipes } from '@nestjs/common';
import { SessionGuard } from '../common/auth/session.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { Roles } from '../common/auth/roles.decorator';
import { AdminReviewDecisionRequestSchema } from '@app/contracts';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ReviewsService } from './reviews.service';

@Controller('admin/reviews')
@UseGuards(SessionGuard, RolesGuard)
@Roles('admin')
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @Get('queue')
  async queue() {
    return this.service.listSubmitted();
  }

  @Get(':courseId/history')
  async history(@Param('courseId') courseId: string) {
    return this.service.getReviews(courseId);
  }

  @Post(':courseId/decision')
  @HttpCode(HttpStatus.OK)
  async decision(
    @Param('courseId') courseId: string,
    @Body(new ZodValidationPipe(AdminReviewDecisionRequestSchema)) body: any,
    @Req() req: any,
  ) {
    return this.service.decide({
      courseId,
      adminId: req.user.id,
      decision: body.decision,
      reason: body.reason,
      note: body.note,
    });
  }
}
