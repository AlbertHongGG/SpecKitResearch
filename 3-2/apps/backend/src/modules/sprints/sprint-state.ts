import { ConflictException } from '@nestjs/common';

import { ErrorCodes } from '../../common/errors/error-codes.js';

export type SprintStatus = 'planned' | 'active' | 'closed';

export function assertSprintStartAllowed(current: SprintStatus) {
  if (current !== 'planned') {
    throw new ConflictException({
      code: ErrorCodes.CONFLICT,
      message: 'Invalid sprint transition',
    });
  }
}

export function assertSprintCloseAllowed(current: SprintStatus) {
  if (current !== 'active') {
    throw new ConflictException({
      code: ErrorCodes.CONFLICT,
      message: 'Invalid sprint transition',
    });
  }
}
