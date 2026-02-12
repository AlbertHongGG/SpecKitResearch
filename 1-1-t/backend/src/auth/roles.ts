import type { Role } from '@prisma/client';

export const Roles = {
  member: 'member',
  admin: 'admin',
} as const satisfies Record<string, Role>;
