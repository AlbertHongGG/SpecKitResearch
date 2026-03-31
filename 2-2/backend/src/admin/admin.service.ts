import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'

import type { ServiceStatus, UserStatus } from '@prisma/client'

import { AuditService } from '../audit/audit.service'
import { PrismaService } from '../common/db/prisma.service'
import { ErrorCodes } from '../common/errors/error-codes'

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listUsers() {
    const items = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return { items }
  }

  async updateUserStatus(input: { actorUserId: string; userId: string; status: UserStatus }) {
    if (!input.userId) {
      throw new BadRequestException({ code: ErrorCodes.BAD_REQUEST, message: 'Invalid user id' })
    }

    return this.prisma.$transaction(async (tx) => {
      const before = await tx.user.findUnique({
        where: { id: input.userId },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
      })
      if (!before) {
        throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'User not found' })
      }

      const after = await tx.user.update({
        where: { id: input.userId },
        data: { status: input.status },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
      })

      await this.audit.write(
        {
          actorUserId: input.actorUserId,
          action: 'ADMIN_USER_STATUS_UPDATE',
          targetType: 'User',
          targetId: input.userId,
          beforeData: { status: before.status },
          afterData: { status: after.status },
        },
        tx,
      )

      return after
    })
  }

  async listServices() {
    const items = await this.prisma.service.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return { items }
  }

  async updateServiceStatus(input: {
    actorUserId: string
    serviceId: string
    status: ServiceStatus
  }) {
    if (!input.serviceId) {
      throw new BadRequestException({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Invalid service id',
      })
    }

    return this.prisma.$transaction(async (tx) => {
      const before = await tx.service.findUnique({ where: { id: input.serviceId } })
      if (!before) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Service not found',
        })
      }

      const after = await tx.service.update({
        where: { id: input.serviceId },
        data: { status: input.status },
      })

      await this.audit.write(
        {
          actorUserId: input.actorUserId,
          action: 'ADMIN_SERVICE_STATUS_UPDATE',
          targetType: 'Service',
          targetId: input.serviceId,
          beforeData: { status: before.status },
          afterData: { status: after.status },
        },
        tx,
      )

      return after
    })
  }

  async getSummaryReport() {
    const [totalBookings, cancelledBookings, activeServicesCount, activeProvidersCount] =
      await Promise.all([
        this.prisma.booking.count(),
        this.prisma.booking.count({ where: { status: 'CANCELLED' } }),
        this.prisma.service.count({ where: { status: 'ACTIVE' } }),
        this.prisma.user.count({ where: { role: 'PROVIDER', status: 'ACTIVE' } }),
      ])

    const cancellationRate = totalBookings === 0 ? 0 : cancelledBookings / totalBookings

    return {
      totalBookings,
      cancellationRate,
      activeServicesCount,
      activeProvidersCount,
    }
  }
}
