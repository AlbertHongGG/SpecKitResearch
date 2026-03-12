import { ForbiddenException } from '@nestjs/common';

import type { SessionPrincipal } from '../../shared/auth/auth.types';

export function assertApiKeyOwnership(principal: SessionPrincipal, apiKeyUserId: string): void {
  if (principal.role === 'admin') return;
  if (principal.userId !== apiKeyUserId) {
    throw new ForbiddenException({
      error: { code: 'forbidden', message: 'Access denied' }
    });
  }
}
