import { Injectable, NotFoundException } from '@nestjs/common'

import { PrismaService } from '../common/db/prisma.service'
import { ErrorCodes } from '../common/errors/error-codes'
import { presentTimeSlot } from '../timeslots/timeslots.presenter'

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async listActive() {
    const items = await this.prisma.service.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    })
    return { items }
  }

  async getServiceWithTimeSlots(serviceId: string) {
    const service = await this.prisma.service.findUnique({ where: { id: serviceId } })
    if (!service || service.status !== 'ACTIVE') {
      throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Service not found' })
    }

    const timeSlots = await this.prisma.timeSlot.findMany({
      where: { serviceId, status: 'OPEN' },
      orderBy: { startTime: 'asc' },
    })

    return { service, timeSlots: timeSlots.map(presentTimeSlot) }
  }
}
