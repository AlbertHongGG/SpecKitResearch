import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { makeError } from '../common/http/error-response'
import { ROLES_KEY, type Role } from './roles.decorator'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredRoles || requiredRoles.length === 0) return true

    const req = context.switchToHttp().getRequest<any>()
    const role = req.user?.role as Role | undefined

    if (!role || !requiredRoles.includes(role)) {
      throw new HttpException(makeError('FORBIDDEN', '權限不足'), HttpStatus.FORBIDDEN)
    }

    return true
  }
}
