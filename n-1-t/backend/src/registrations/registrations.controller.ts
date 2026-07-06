import { Body, Controller, Delete, Param, Post, Req, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { IdempotencyKeyDto } from './dto/idempotency-key.dto';
import { RegistrationsService } from './registrations.service';

@Controller()
@UseGuards(AuthGuard)
export class RegistrationsController {
  constructor(private readonly registrations: RegistrationsService) {}

  @Post('activities/:activityId/registrations')
  register(@Req() req: any, @Param('activityId') activityId: string, @Body() body: IdempotencyKeyDto) {
    const user = req.user as AuthUser;
    return this.registrations.register({ userId: user.id, activityId, idempotencyKey: body?.idempotencyKey });
  }

  @Delete('activities/:activityId/registrations')
  cancel(@Req() req: any, @Param('activityId') activityId: string, @Body() body: IdempotencyKeyDto) {
    const user = req.user as AuthUser;
    return this.registrations.cancel({ userId: user.id, activityId, idempotencyKey: body?.idempotencyKey });
  }
}
