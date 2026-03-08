import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class OrgScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const orgId = request.headers['x-organization-id'] as string;
    if (!orgId) {
      throw new ForbiddenException({ code: 'ORG_SCOPE_REQUIRED', message: 'Organization scope missing' });
    }
    request.orgId = orgId;
    return true;
  }
}
