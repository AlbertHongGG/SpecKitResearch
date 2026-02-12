import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { env } from '../common/config/env';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './jwt-payload';
import { AppError } from '../common/errors/app-error';
import { ErrorCodes } from '../common/errors/error-codes';
import { UserRole } from '@prisma/client';

function toApiUserRole(role: UserRole): 'Customer' | 'Agent' | 'Admin' {
  switch (role) {
    case UserRole.CUSTOMER:
      return 'Customer';
    case UserRole.AGENT:
      return 'Agent';
    case UserRole.ADMIN:
      return 'Admin';
  }

  throw new Error(`Unknown role: ${String(role)}`);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly users: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: env.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.users.findById(payload.sub);
    if (!user) {
      throw new AppError({
        status: 401,
        code: ErrorCodes.AUTH_TOKEN_INVALID,
        message: 'Invalid token',
      });
    }

    if (!user.isActive) {
      throw new AppError({
        status: 403,
        code: ErrorCodes.AUTH_USER_DISABLED,
        message: 'User disabled',
      });
    }

    if (user.tokenVersion !== payload.ver) {
      throw new AppError({
        status: 401,
        code: ErrorCodes.AUTH_TOKEN_INVALID,
        message: 'Token revoked',
      });
    }

    return { id: user.id, role: toApiUserRole(user.role) };
  }
}
