import { Controller, Delete, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtGuard } from '../auth/jwt.guard';
import type { AuthUser } from '../auth/auth.types';
import { RegistrationsService } from './registrations.service';

@Controller('activities/:activityId/registrations')
export class RegistrationsController {
  constructor(private readonly registrations: RegistrationsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtGuard)
  async register(@Req() req: Request, @Param('activityId') activityId: string) {
    const user = req.user as AuthUser;
    return this.registrations.register({ activityId, userId: user.id });
  }

  @Delete('me')
  @UseGuards(JwtGuard)
  async cancel(@Req() req: Request, @Param('activityId') activityId: string) {
    const user = req.user as AuthUser;
    return this.registrations.cancel({ activityId, userId: user.id });
  }
}
