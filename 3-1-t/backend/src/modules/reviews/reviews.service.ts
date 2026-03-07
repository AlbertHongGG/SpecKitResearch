import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { AuditActions } from '../../common/audit/audit-actions';
import { AuditService } from '../../common/audit/audit.service';
import type { CurrentUser } from '../../auth/types';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateReviewBody } from './reviews.schemas';

function sanitizeComment(comment: string) {
  return comment.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createReview(user: CurrentUser | undefined, body: CreateReviewBody) {
    if (!user) throw new UnauthorizedException('Authentication required');

    const deliveredSubOrder = await this.prisma.subOrder.findFirst({
      where: {
        status: 'DELIVERED',
        order: { buyerId: user.id },
        items: { some: { productId: body.productId } },
      },
    });

    if (!deliveredSubOrder) {
      throw new ConflictException('Review requires delivered purchase');
    }

    const review = await this.prisma.review.upsert({
      where: {
        productId_buyerId: {
          productId: body.productId,
          buyerId: user.id,
        },
      },
      create: {
        productId: body.productId,
        buyerId: user.id,
        rating: body.rating,
        comment: sanitizeComment(body.comment),
      },
      update: {
        rating: body.rating,
        comment: sanitizeComment(body.comment),
      },
    });

    await this.auditService.write({
      actorId: user.id,
      actorRole: 'BUYER',
      action: AuditActions.REVIEW_CREATE,
      targetType: 'Review',
      targetId: review.id,
      metadata: { productId: body.productId, rating: body.rating },
    });

    return review;
  }
}
