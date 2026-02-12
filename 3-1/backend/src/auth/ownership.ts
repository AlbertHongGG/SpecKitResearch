import { ForbiddenException } from '@nestjs/common';
import { ErrorCodes } from '../shared/http/error-codes';
import type { AuthUser } from './types';

export function assertBuyerOwns(user: AuthUser, buyerId: string) {
  if (user.id !== buyerId && !user.roles.includes('admin')) {
    throw new ForbiddenException({ code: ErrorCodes.FORBIDDEN, message: 'Forbidden' });
  }
}

export function assertSellerOwns(user: AuthUser, sellerId: string) {
  if (user.id !== sellerId && !user.roles.includes('admin')) {
    throw new ForbiddenException({ code: ErrorCodes.FORBIDDEN, message: 'Forbidden' });
  }
}
