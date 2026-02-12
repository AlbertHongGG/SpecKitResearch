import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'
import { DomainError } from '../errors/domain-error'
import { ERROR_CODES } from '../errors/error-codes'
import type { RequestUser } from './jwt-auth.guard'

export const ROLES_KEY = 'roles'

type AuthedRequest = Request & { user?: RequestUser }

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Array<RequestUser['role']>>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    )

    if (!roles || roles.length === 0) return true

    const request = context.switchToHttp().getRequest<AuthedRequest>()
    const user = request.user

    if (!user) {
      throw new DomainError({
        code: ERROR_CODES.UNAUTHORIZED,
        message: 'Unauthorized',
        status: 401,
      })
    }

    if (!roles.includes(user.role)) {
      throw new DomainError({
        code: ERROR_CODES.FORBIDDEN,
        message: 'Forbidden',
        status: 403,
      })
    }

    return true
  }
}
