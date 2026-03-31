import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import type { UserRole } from '@prisma/client'
import { ErrorCodes } from '../common/errors/error-codes'
import { ROLES_KEY } from './roles.decorator'

type AuthUser = { id: string; role: UserRole; status: string }

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!requiredRoles || requiredRoles.length === 0) return true

    const req = context.switchToHttp().getRequest()
    const user = req.user as AuthUser | undefined
    if (!user) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: 'Forbidden',
      })
    }

    const ok = requiredRoles.includes(user.role)
    if (!ok) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: 'Forbidden',
      })
    }

    return true
  }
}
