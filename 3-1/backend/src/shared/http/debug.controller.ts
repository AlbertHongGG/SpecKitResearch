import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import type { AuthUser } from '../../auth/types';
import { assertBuyerOwns } from '../../auth/ownership';
import type { Request } from 'express';

type AuthedRequest = Request & { user?: AuthUser };

@Controller('debug')
export class DebugController {
  @Get('any')
  @UseGuards(AuthGuard)
  any() {
    return { ok: true };
  }

  @Get('admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  admin() {
    return { ok: true };
  }

  @Get('buyer/:buyerId')
  @UseGuards(AuthGuard)
  buyer(@Req() req: AuthedRequest, @Param('buyerId') buyerId: string) {
    assertBuyerOwns(req.user!, buyerId);
    return { ok: true };
  }
}
