import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import type { RequestWithUser } from '../auth/session.guard.js';
import { throwForbidden } from '../rbac/existence-strategy.js';
import { isPlatformAdmin } from '../rbac/roles.js';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const role = req.user?.platformRole;

    if (!isPlatformAdmin(role)) {
      throwForbidden('Platform admin role required');
    }

    return true;
  }
}
