import { Controller, Get, Param } from '@nestjs/common';
import { z } from 'zod';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

import { ServicesService } from './services.service';

const ServiceIdParamSchema = z
  .object({
    serviceId: z.string().uuid(),
  })
  .strict();

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  listPublicServices() {
    return this.servicesService.listPublicServices();
  }

  @Get(':serviceId')
  getPublicServiceDetail(
    @Param(new ZodValidationPipe(ServiceIdParamSchema))
    params: z.infer<typeof ServiceIdParamSchema>,
  ) {
    return this.servicesService.getPublicServiceDetail(params.serviceId);
  }
}
