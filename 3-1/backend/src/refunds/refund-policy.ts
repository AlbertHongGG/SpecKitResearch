import { ConflictException } from '@nestjs/common';
import { ErrorCodes } from '../shared/http/error-codes';

export function assertRefundWindow(params: { deliveredAt: Date; now?: Date; days?: number }) {
  const days = params.days ?? 7;
  const now = params.now ?? new Date();
  const ms = days * 24 * 60 * 60 * 1000;
  if (now.getTime() - params.deliveredAt.getTime() > ms) {
    throw new ConflictException({
      code: ErrorCodes.CONFLICT,
      message: `Refund window expired (${days} days)`,
    });
  }
}
