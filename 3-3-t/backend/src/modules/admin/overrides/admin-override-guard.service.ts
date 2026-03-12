import { BadRequestException, Injectable } from '@nestjs/common';

type OverrideLike = { forcedStatus: string; revokedAt: Date | null };

@Injectable()
export class AdminOverrideGuardService {
  assertCanApply(forcedStatus: 'Suspended' | 'Expired') {
    if (!['Suspended', 'Expired'].includes(forcedStatus)) {
      throw new BadRequestException('Invalid override status');
    }
  }

  assertCanRevoke(override: OverrideLike) {
    if (override.revokedAt) {
      throw new BadRequestException('Override already revoked');
    }
    if (override.forcedStatus !== 'Suspended') {
      throw new BadRequestException('Only suspended override can be revoked');
    }
  }
}
