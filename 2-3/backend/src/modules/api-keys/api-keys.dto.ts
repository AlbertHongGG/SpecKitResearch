import { z } from 'zod';

export class ApiKeyCreateDto {
  static schema = z.object({
    name: z.string().min(1),
    scopes: z.array(z.string().min(1)),
    expires_at: z.string().datetime().nullable().optional(),
    rate_limit_per_minute: z.number().int().positive().nullable().optional(),
    rate_limit_per_hour: z.number().int().positive().nullable().optional(),
    replaces_api_key_id: z.string().uuid().nullable().optional()
  });

  name!: string;
  scopes!: string[];
  expires_at?: string | null;
  rate_limit_per_minute?: number | null;
  rate_limit_per_hour?: number | null;
  replaces_api_key_id?: string | null;
}

export class ApiKeyUpdateDto {
  static schema = z.object({
    name: z.string().min(1).optional(),
    scopes: z.array(z.string().min(1)).optional(),
    expires_at: z.string().datetime().nullable().optional(),
    rate_limit_per_minute: z.number().int().positive().nullable().optional(),
    rate_limit_per_hour: z.number().int().positive().nullable().optional(),
  });

  name?: string;
  scopes?: string[];
  expires_at?: string | null;
  rate_limit_per_minute?: number | null;
  rate_limit_per_hour?: number | null;
}
