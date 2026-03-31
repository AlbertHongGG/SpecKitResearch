import { Controller, Get, Param } from '@nestjs/common'

import { ServicesService } from './services.service'

@Controller()
export class PublicServicesController {
  constructor(private readonly services: ServicesService) {}

  @Get('services')
  async listServices() {
    return this.services.listActive()
  }

  @Get('services/:serviceId')
  async getService(@Param('serviceId') serviceId: string) {
    return this.services.getServiceWithTimeSlots(serviceId)
  }
}
