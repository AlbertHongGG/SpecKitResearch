import { Injectable } from '@nestjs/common'
import type { Role } from '@prisma/client'
import { PrismaService } from '../../common/prisma/prisma.service'
import { DomainError } from '../../common/errors/domain-error'
import { ERROR_CODES } from '../../common/errors/error-codes'
import { hashPassword } from '../auth/password.util'
import type { UserRole } from '../tickets/ticket.types'

function toUserRole(role: Role): UserRole {
  return role
}

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { role?: UserRole; isActive?: boolean }) {
    const where: any = {}
    if (params.role) where.role = params.role
    if (typeof params.isActive === 'boolean') where.isActive = params.isActive

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, role: true, isActive: true, createdAt: true },
      }),
      this.prisma.user.count({ where }),
    ])

    return {
      items: items.map((u) => ({
        id: u.id,
        email: u.email,
        role: toUserRole(u.role),
        is_active: u.isActive,
        created_at: u.createdAt.toISOString(),
      })),
      total,
    }
  }

  async create(params: { email: string; password: string; role: 'Agent' | 'Admin' }) {
    const passwordHash = await hashPassword(params.password)

    try {
      const user = await this.prisma.user.create({
        data: {
          email: params.email,
          passwordHash,
          role: params.role,
          isActive: true,
        },
        select: { id: true, email: true, role: true, isActive: true, createdAt: true },
      })

      return {
        user: {
          id: user.id,
          email: user.email,
          role: toUserRole(user.role),
          is_active: user.isActive,
          created_at: user.createdAt.toISOString(),
        },
      }
    } catch {
      throw new DomainError({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Email already exists',
        status: 400,
      })
    }
  }

  async update(params: { userId: string; isActive?: boolean | null; role?: UserRole | null }) {
    const existing = await this.prisma.user.findUnique({
      where: { id: params.userId },
      select: { id: true },
    })

    if (!existing) {
      throw new DomainError({ code: ERROR_CODES.NOT_FOUND, message: 'Not Found', status: 404 })
    }

    const data: any = {}
    if (typeof params.isActive === 'boolean') data.isActive = params.isActive
    if (params.role) data.role = params.role

    const user = await this.prisma.user.update({
      where: { id: params.userId },
      data,
      select: { id: true, email: true, role: true, isActive: true, createdAt: true },
    })

    return {
      user: {
        id: user.id,
        email: user.email,
        role: toUserRole(user.role),
        is_active: user.isActive,
        created_at: user.createdAt.toISOString(),
      },
    }
  }
}
