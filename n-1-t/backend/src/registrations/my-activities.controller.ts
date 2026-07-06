import { Controller, Get, Req, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { RegistrationsService } from './registrations.service';

@Controller()
@UseGuards(AuthGuard)
export class MyActivitiesController {
  constructor(private readonly registrations: RegistrationsService) {}

  @Get('my-activities')
  myActivities(@Req() req: any) {
    const user = req.user as AuthUser;
    return this.registrations.listMyActivities(user.id);
  }
}
