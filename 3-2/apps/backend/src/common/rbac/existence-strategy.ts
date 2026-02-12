import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { ErrorCodes } from '../errors/error-codes.js';

export function throwNotFound(): never {
  throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Not found' });
}

export function throwForbidden(message = 'Forbidden'): never {
  throw new ForbiddenException({ code: ErrorCodes.FORBIDDEN, message });
}
