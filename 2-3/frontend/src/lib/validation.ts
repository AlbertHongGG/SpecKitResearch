import { z } from 'zod';

export { z };

export function zodStringTrimmed(min = 1) {
  return z.string().trim().min(min);
}
