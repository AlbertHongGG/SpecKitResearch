import { z } from 'zod';

export class AdminServiceCreateDto {
  static schema = z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    status: z.enum(['active', 'disabled']).optional()
  });

  name!: string;
  description!: string;
  status?: 'active' | 'disabled';
}

export class AdminServiceUpdateDto {
  static schema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    status: z.enum(['active', 'disabled']).optional()
  });

  name?: string;
  description?: string;
  status?: 'active' | 'disabled';
}
