import { ForbiddenException, Injectable } from '@nestjs/common';

import type { CurrentUser } from '../types';

@Injectable()
export class OwnershipService {
  assertBuyer(buyerId: string, currentUser: CurrentUser | undefined) {
    if (!currentUser || currentUser.id !== buyerId) {
      throw new ForbiddenException('Not owner');
    }
  }

  assertSeller(sellerId: string, currentUser: CurrentUser | undefined) {
    if (!currentUser || currentUser.id !== sellerId) {
      throw new ForbiddenException('Not owner');
    }
  }
}
