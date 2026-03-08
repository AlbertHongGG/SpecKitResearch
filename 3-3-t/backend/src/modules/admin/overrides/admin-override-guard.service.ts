import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class AdminOverrideGuardService {
  assertCanApply(forcedStatus: 'Suspended' | 'Expired') {
    if (!['Suspended', 'Expired'].includes(forcedStatus)) {
      throw new BadRequestException('Invalid override status');
    }
  }
}
