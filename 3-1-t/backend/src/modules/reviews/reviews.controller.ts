import { Body, Controller, Post, UsePipes } from '@nestjs/common';

import { CurrentUser } from '../../auth/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../auth/types';
import { ZodValidationPipe } from '../../common/validation/zod.pipe';
import { createReviewSchema, type CreateReviewBody } from './reviews.schemas';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createReviewSchema))
  async create(
    @CurrentUser() user: CurrentUserType | undefined,
    @Body() body: CreateReviewBody,
  ) {
    return this.reviewsService.createReview(user, body);
  }
}
