import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'

import { AuditService } from '../audit/audit.service'
import { PrismaService } from '../common/db/prisma.service'
import { ErrorCodes } from '../common/errors/error-codes'

@Injectable()
export class ProviderServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createService(input: {
    providerId: string
    name: string
    description: string
    durationMinutes: number
  }) {
    if (!input.name || input.durationMinutes < 1) {
      throw new BadRequestException({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Invalid request body',
      })
    }

    const service = await this.prisma.service.create({
      data: {
        providerId: input.providerId,
        name: input.name,
        description: input.description,
        durationMinutes: input.durationMinutes,
        status: 'ACTIVE',
      },
    })

    await this.audit.write({
      actorUserId: input.providerId,
      action: 'PROVIDER_SERVICE_CREATE',
      targetType: 'Service',
      targetId: service.id,
      afterData: {
        id: service.id,
        providerId: service.providerId,
        name: service.name,
        status: service.status,
      },
    })

    return service
  }

  async listMine(providerId: string) {
    const items = await this.prisma.service.findMany({
      where: { providerId },
      orderBy: { createdAt: 'desc' },
    })
    return { items }
  }

  async getMine(input: { providerId: string; serviceId: string }) {
    const service = await this.prisma.service.findUnique({ where: { id: input.serviceId } })
    if (!service || service.providerId !== input.providerId) {
      throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Service not found' })
    }
    return service
  }

  async updateService(input: {
    providerId: string
    serviceId: string
    patch: {
      name?: string
      description?: string
      durationMinutes?: number
      status?: 'ACTIVE' | 'INACTIVE'
    }
  }) {
    const service = await this.prisma.service.findUnique({ where: { id: input.serviceId } })
    if (!service || service.providerId !== input.providerId) {
      throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Service not found' })
    }

    if (input.patch.durationMinutes !== undefined && input.patch.durationMinutes < 1) {
      throw new BadRequestException({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Invalid request body',
      })
    }

    const data: Prisma.ServiceUpdateInput = {}
    if (typeof input.patch.name === 'string') data.name = input.patch.name
    if (typeof input.patch.description === 'string') data.description = input.patch.description
    if (typeof input.patch.durationMinutes === 'number')
      data.durationMinutes = input.patch.durationMinutes
    if (input.patch.status === 'ACTIVE' || input.patch.status === 'INACTIVE')
      data.status = input.patch.status

    if (Object.keys(data).length === 0) {
      throw new ConflictException({ code: ErrorCodes.CONFLICT, message: 'No changes' })
    }

    const updated = await this.prisma.service.update({
      where: { id: service.id },
      data,
    })

    await this.audit.write({
      actorUserId: input.providerId,
      action: 'PROVIDER_SERVICE_UPDATE',
      targetType: 'Service',
      targetId: updated.id,
      beforeData: {
        id: service.id,
        name: service.name,
        description: service.description,
        durationMinutes: service.durationMinutes,
        status: service.status,
      },
      afterData: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        durationMinutes: updated.durationMinutes,
        status: updated.status,
      },
    })

    return updated
  }
}
