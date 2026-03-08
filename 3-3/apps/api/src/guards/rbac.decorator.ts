import { SetMetadata } from '@nestjs/common';

export const ORG_ROLE_KEY = 'requiredOrgRole';

export function RequireOrgRole(role: 'END_USER' | 'ORG_ADMIN') {
  return SetMetadata(ORG_ROLE_KEY, role);
}
