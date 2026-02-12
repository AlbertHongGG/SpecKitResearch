import { SetMetadata } from '@nestjs/common';
import type { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

export const RolesRequired = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
