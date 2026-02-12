import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from './auth.constants.js';

export type Role = 'student' | 'instructor' | 'admin';

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
