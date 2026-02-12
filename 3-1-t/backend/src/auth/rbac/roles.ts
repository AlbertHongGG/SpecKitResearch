import type { UserRole } from '@prisma/client';

export const Roles = {
  BUYER: 'BUYER',
  SELLER: 'SELLER',
  ADMIN: 'ADMIN',
} as const satisfies Record<string, UserRole>;

export type Role = UserRole;
