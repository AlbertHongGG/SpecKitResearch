import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

export const RequireRoles = (...roles: UserRole[]) =>
  SetMetadata(ROLES_KEY, roles);
