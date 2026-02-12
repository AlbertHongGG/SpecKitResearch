import { SetMetadata } from '@nestjs/common';

export type ApiRole = 'Customer' | 'Agent' | 'Admin';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: ApiRole[]) => SetMetadata(ROLES_KEY, roles);
