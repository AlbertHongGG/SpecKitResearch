import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { getEnv } from '../common/config/env.validation';
import { AuthUser } from './auth.types';
import { Role } from '@prisma/client';

function cookieExtractor(req: Request): string | null {
  const cookies = (req as Request & { cookies?: unknown }).cookies;
  const token =
    cookies && typeof cookies === 'object'
      ? (cookies as Record<string, unknown>)['access_token']
      : undefined;
  return typeof token === 'string' ? token : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const env = getEnv();
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      ignoreExpiration: false,
      secretOrKey: env.JWT_ACCESS_SECRET,
    });
  }

  validate(payload: unknown): AuthUser {
    if (!payload || typeof payload !== 'object') {
      throw new UnauthorizedException({
        code: 'unauthorized',
        message: 'Invalid token',
      });
    }
    const p = payload as Record<string, unknown>;
    const userId = p.sub;
    const role = p.role;
    const departmentId = p.departmentId;
    if (typeof userId !== 'string' || typeof departmentId !== 'string') {
      throw new UnauthorizedException({
        code: 'unauthorized',
        message: 'Invalid token',
      });
    }
    if (role !== Role.employee && role !== Role.manager) {
      throw new UnauthorizedException({
        code: 'unauthorized',
        message: 'Invalid token',
      });
    }
    return { userId, role, departmentId };
  }
}
