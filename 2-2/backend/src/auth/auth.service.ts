import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { UserRole } from '@prisma/client'

import { env } from '../common/config/env'
import { PrismaService } from '../common/db/prisma.service'
import { ErrorCodes } from '../common/errors/error-codes'
import { hashPassword, verifyPassword } from './password'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(input: { email: string; password: string; role: UserRole }) {
    if (input.role === 'ADMIN') {
      throw new ConflictException({
        code: ErrorCodes.CONFLICT,
        message: 'Cannot self-register as admin',
      })
    }

    try {
      const user = await this.prisma.user.create({
        data: {
          email: input.email,
          passwordHash: await hashPassword(input.password),
          role: input.role,
          status: 'ACTIVE',
        },
      })

      const accessToken = await this.jwt.signAsync({
        sub: user.id,
        role: user.role,
        status: user.status,
      })

      const expiresAt = new Date(Date.now() + env.JWT_EXPIRES_IN_SECONDS * 1000)

      return { accessToken, expiresAt, user }
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException({
          code: ErrorCodes.CONFLICT,
          message: 'Email already exists',
        })
      }
      throw err
    }
  }

  async login(input: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } })
    if (!user) {
      throw new UnauthorizedException({
        code: ErrorCodes.INVALID_CREDENTIALS,
        message: 'Invalid credentials',
      })
    }

    if (user.status === 'SUSPENDED') {
      throw new ForbiddenException({
        code: ErrorCodes.USER_SUSPENDED,
        message: 'User is suspended',
      })
    }

    const ok = await verifyPassword(input.password, user.passwordHash)
    if (!ok) {
      throw new UnauthorizedException({
        code: ErrorCodes.INVALID_CREDENTIALS,
        message: 'Invalid credentials',
      })
    }

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      role: user.role,
      status: user.status,
    })

    const expiresAt = new Date(Date.now() + env.JWT_EXPIRES_IN_SECONDS * 1000)

    return { accessToken, expiresAt, user }
  }
}
