import { Injectable } from '@nestjs/common';
import { AppError } from '../../common/app-error';

@Injectable()
export class SubscriptionGuard {
  assertNotExpired(status: 'Expired' | string) {
    if (status === 'Expired') {
      throw new AppError({ errorCode: 'CONFLICT', status: 409, message: 'Subscription is expired and irreversible' });
    }
  }
}
