import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthUser } from './auth.types';

@Controller('session')
export class SessionController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async session(@Req() req: Request & { user?: AuthUser }) {
    const userId = req.user!.userId;
    const user = await this.usersService.findById(userId);
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department_id: user.departmentId,
        manager_id: user.managerId,
      },
    };
  }
}
