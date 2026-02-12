import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common'
import type { Request } from 'express'
import { DomainError } from '../errors/domain-error'
import { ERROR_CODES } from '../errors/error-codes'
import { UsersService } from '../../modules/users/users.service'
import { AppJwtService } from '../../modules/auth/jwt.service'

export type RequestUser = {
  id: string
  email: string
  role: 'Customer' | 'Agent' | 'Admin'
}

type AuthedRequest = Request & {
  user?: RequestUser
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: AppJwtService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>()

    const auth = req.header('authorization')
    if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
      throw new DomainError({
        code: ERROR_CODES.UNAUTHORIZED,
        message: 'Unauthorized',
        status: 401,
      })
    }

    const token = auth.slice('bearer '.length).trim()
    let payload
    try {
      payload = this.jwt.verifyAccessToken(token)
    } catch {
      throw new DomainError({
        code: ERROR_CODES.UNAUTHORIZED,
        message: 'Unauthorized',
        status: 401,
      })
    }

    const user = await this.users.findById(payload.sub)
    if (!user || !user.isActive) {
      throw new DomainError({
        code: ERROR_CODES.UNAUTHORIZED,
        message: 'Unauthorized',
        status: 401,
      })
    }

    req.user = { id: user.id, email: user.email, role: user.role }
    return true
  }
}
