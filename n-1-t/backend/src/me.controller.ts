import { Controller, Get, Req, UseGuards } from '@nestjs/common';

import { AuthGuard } from './auth/auth.guard';
import type { AuthUser } from './auth/auth.types';

@Controller()
export class MeController {
  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() req: any) {
    const user = req.user as AuthUser;
    return { id: user.id, email: user.email, name: user.name, role: user.role.toLowerCase() };
  }
}
