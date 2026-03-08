import { z } from 'zod';
import { ReplayScopeSchema } from '@app/contracts';

export const ReplayRequestBodySchema = z.object({
  scope: ReplayScopeSchema,
});
