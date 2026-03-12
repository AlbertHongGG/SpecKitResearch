import { z } from 'zod';

export class AdminScopeCreateDto {
  static schema = z.object({
    name: z.string().min(1),
    description: z.string().min(1)
  });

  name!: string;
  description!: string;
}

export class AdminScopeUpdateDto {
  static schema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().min(1).optional()
  });

  name?: string;
  description?: string;
}

export class AdminScopeRuleCreateDto {
  static schema = z.object({
    scope_id: z.string().uuid(),
    endpoint_id: z.string().uuid()
  });

  scope_id!: string;
  endpoint_id!: string;
}
