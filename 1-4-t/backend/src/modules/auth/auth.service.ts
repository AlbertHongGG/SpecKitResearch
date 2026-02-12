import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { DomainError } from '../../common/errors/domain-error'
import { ERROR_CODES } from '../../common/errors/error-codes'
import { AppJwtService } from './jwt.service'
import { hashPassword, verifyPassword } from './password.util'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: AppJwtService,
  ) {}

  async register(params: { email: string; password: string }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: params.email },
      select: { id: true },
    })
    if (existing) {
      throw new DomainError({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Email already registered',
        status: 400,
      })
    }

    const passwordHash = await hashPassword(params.password)

    const user = await this.prisma.user.create({
      data: {
        email: params.email,
        passwordHash,
        role: 'Customer',
        isActive: true,
      },
      select: { id: true, email: true, role: true },
    })

    const token = this.jwt.signAccessToken({ sub: user.id, role: user.role })

    return {
      token,
      user,
    }
  }

  async login(params: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: params.email },
      select: { id: true, email: true, role: true, passwordHash: true, isActive: true },
    })

    if (!user || !user.isActive) {
      throw new DomainError({
        code: ERROR_CODES.UNAUTHORIZED,
        message: 'Unauthorized',
        status: 401,
      })
    }

    const ok = await verifyPassword({
      password: params.password,
      passwordHash: user.passwordHash,
    })

    if (!ok) {
      throw new DomainError({
        code: ERROR_CODES.UNAUTHORIZED,
        message: 'Unauthorized',
        status: 401,
      })
    }

    const token = this.jwt.signAccessToken({ sub: user.id, role: user.role })

    return {
      token,
      user: { id: user.id, email: user.email, role: user.role },
    }
  }

  async logout() {
    // bearer-only token strategy: client discards token
    return { ok: true }
  }
}
