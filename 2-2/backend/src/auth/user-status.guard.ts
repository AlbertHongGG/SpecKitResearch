import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'

import type { UserStatus } from '@prisma/client'
import { PrismaService } from '../common/db/prisma.service'
import { ErrorCodes } from '../common/errors/error-codes'

type AuthUser = { id: string; status: UserStatus }

@Injectable()
export class UserStatusGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest()
    const user = req.user as AuthUser | undefined
    if (!user) return true

    const latest = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { status: true },
    })

    const status = latest?.status
    if (status) {
      req.user = { ...user, status }
    }

    if (status === 'SUSPENDED') {
      // Spec: treat suspended as unauthorized.
      throw new UnauthorizedException({
        code: ErrorCodes.USER_SUSPENDED,
        message: 'User is suspended',
      })
    }

    return true
  }
}
