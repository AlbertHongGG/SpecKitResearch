import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly allow: string[]) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const role = request.role || 'END_USER';
    if (!this.allow.includes(role)) {
      throw new ForbiddenException({ code: 'RBAC_FORBIDDEN', message: 'Permission denied' });
    }
    return true;
  }
}
