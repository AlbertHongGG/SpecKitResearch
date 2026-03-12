import { z } from 'zod';

export class RateLimitPolicyUpdateDto {
  static schema = z.object({
    default_per_minute: z.number().int().positive(),
    default_per_hour: z.number().int().positive(),
    cap_per_minute: z.number().int().positive(),
    cap_per_hour: z.number().int().positive()
  });

  default_per_minute!: number;
  default_per_hour!: number;
  cap_per_minute!: number;
  cap_per_hour!: number;
}
