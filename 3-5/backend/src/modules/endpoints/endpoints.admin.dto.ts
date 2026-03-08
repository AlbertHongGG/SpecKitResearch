import { z } from 'zod';

export class AdminEndpointCreateDto {
  static schema = z.object({
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
    path: z.string().min(1),
    description: z.string().min(1).optional(),
    status: z.enum(['active', 'disabled']).optional()
  });

  method!: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path!: string;
  description?: string;
  status?: 'active' | 'disabled';
}

export class AdminEndpointUpdateDto {
  static schema = z.object({
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
    path: z.string().min(1).optional(),
    description: z.string().min(1).nullable().optional(),
    status: z.enum(['active', 'disabled']).optional()
  });

  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path?: string;
  description?: string | null;
  status?: 'active' | 'disabled';
}
