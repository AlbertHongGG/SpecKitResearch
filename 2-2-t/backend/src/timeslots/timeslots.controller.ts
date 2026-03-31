import { Controller, Get, Query } from '@nestjs/common';
import { z } from 'zod';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

import { TimeSlotsService } from './timeslots.service';

const QuerySchema = z
  .object({
    serviceId: z.string().uuid().optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  })
  .strict();

@Controller('timeslots')
export class TimeSlotsController {
  constructor(private readonly timeSlotsService: TimeSlotsService) {}

  @Get()
  listOpenTimeSlots(
    @Query(new ZodValidationPipe(QuerySchema)) query: z.infer<typeof QuerySchema>,
  ) {
    return this.timeSlotsService.listOpenTimeSlots({
      serviceId: query.serviceId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
  }
}
