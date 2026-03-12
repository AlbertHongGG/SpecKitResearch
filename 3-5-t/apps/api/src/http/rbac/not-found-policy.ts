import { HttpError } from '../errors';

export function hideResourceExistence(): never {
  throw new HttpError(404, 'NOT_FOUND', 'Not found');
}

export function forbidden(): never {
  throw new HttpError(403, 'FORBIDDEN', 'Forbidden');
}
