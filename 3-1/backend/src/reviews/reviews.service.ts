import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../shared/db/prisma.service';
import { ErrorCodes } from '../shared/http/error-codes';
import { AuditService } from '../audit/audit.service';
import { AuditActions } from '../audit/audit.actions';

function containsHtml(input: string) {
  return /<[^>]+>/.test(input);
}

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(params: { buyerId: string; productId: string; rating: number; comment: string }) {
    if (containsHtml(params.comment)) {
      throw new ConflictException({ code: ErrorCodes.CONFLICT, message: 'HTML is not allowed in comments' });
    }

    const delivered = await this.prisma.subOrder.findFirst({
      where: {
        order: { buyerId: params.buyerId },
        status: 'delivered',
        items: { some: { productId: params.productId } },
      },
      select: { id: true },
    });
    if (!delivered) {
      throw new ConflictException({ code: ErrorCodes.CONFLICT, message: 'Not delivered yet' });
    }

    const existing = await this.prisma.review.findFirst({
      where: { buyerId: params.buyerId, productId: params.productId },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException({ code: ErrorCodes.CONFLICT, message: 'Already reviewed' });
    }

    const review = await this.prisma.review.create({
      data: {
        buyerId: params.buyerId,
        productId: params.productId,
        rating: params.rating,
        comment: params.comment,
      },
    });

    await this.audit.write({
      actorUserId: params.buyerId,
      actorRole: 'buyer',
      action: AuditActions.REVIEW_CREATE,
      targetType: 'Review',
      targetId: review.id,
      metadata: { productId: params.productId },
    });

    return review;
  }
}
