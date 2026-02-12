import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import type { Response } from 'express';
import { getEnv } from '../common/config/env.validation';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async login(res: Response, email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException({
        code: 'unauthorized',
        message: 'Invalid credentials',
      });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException({
        code: 'unauthorized',
        message: 'Invalid credentials',
      });
    }

    const token = await this.jwt.signAsync({
      sub: user.id,
      role: user.role,
      departmentId: user.departmentId,
    });

    const env = getEnv();
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: env.COOKIE_SAMESITE,
      path: '/',
    });

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

  logout(res: Response) {
    res.clearCookie('access_token', { path: '/' });
    return { ok: true };
  }
}
