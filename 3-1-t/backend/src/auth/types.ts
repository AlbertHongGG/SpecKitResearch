import type { UserRole } from '@prisma/client';

export type CurrentUser = {
  id: string;
  roles: UserRole[];
};
