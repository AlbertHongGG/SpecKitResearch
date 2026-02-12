import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthUser } from '../auth/types';
import { ZodValidationPipe } from '../shared/validation/zod-validation.pipe';
import { ReviewsService } from './reviews.service';

type AuthedRequest = Request & { user?: AuthUser };

const createSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1),
});

@Controller('reviews')
@UseGuards(AuthGuard)
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post()
  async create(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(createSchema)) body: z.infer<typeof createSchema>,
  ) {
    const review = await this.reviews.create({
      buyerId: req.user!.id,
      productId: body.productId,
      rating: body.rating,
      comment: body.comment,
    });
    return { review };
  }
}
