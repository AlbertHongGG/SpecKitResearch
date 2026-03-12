import { NotFoundException } from '@nestjs/common';

import { ERROR_CODES } from './error-codes';

export function resourceHidden(resourceName: string): NotFoundException {
  return new NotFoundException({
    code: ERROR_CODES.RESOURCE_NOT_FOUND,
    message: `${resourceName} could not be found.`,
  });
}
