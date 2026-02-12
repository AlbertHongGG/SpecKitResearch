import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { AuthSessionService } from './auth-session.service';
import { hashPassword, verifyPassword } from './password';
import { JwtTokenService } from './jwt.service';
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

  // Exhaustiveness
  throw new Error(`Unknown role: ${String(role)}`);
}

function toApiUser(user: {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    role: toApiUserRole(user.role),
    is_active: user.isActive,
    created_at: user.createdAt.toISOString(),
    updated_at: user.updatedAt.toISOString(),
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly sessions: AuthSessionService,
    private readonly jwt: JwtTokenService,
  ) {}

  async register(params: {
    email: string;
    password: string;
    passwordConfirm: string;
  }) {
    if (params.password !== params.passwordConfirm) {
      throw new AppError({
        status: 400,
        code: ErrorCodes.BAD_REQUEST,
        message: 'Passwords do not match',
      });
    }

    if (params.password.length < 8) {
      throw new AppError({
        status: 400,
        code: ErrorCodes.BAD_REQUEST,
        message: 'Password too short',
      });
    }

    const existing = await this.users.findByEmail(params.email);
    if (existing) {
      throw new AppError({
        status: 409,
        code: ErrorCodes.USER_EMAIL_EXISTS,
        message: 'Email already registered',
      });
    }

    const passwordHash = await hashPassword(params.password);
    const user = await this.users.createUser({
      email: params.email,
      passwordHash,
      role: UserRole.CUSTOMER,
    });

    return { user: toApiUser(user) };
  }

  async login(params: {
    email: string;
    password: string;
    userAgent?: string;
    ip?: string;
  }) {
    const user = await this.users.findByEmail(params.email);
    if (!user) {
      throw new AppError({
        status: 401,
        code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
        message: 'Invalid credentials',
      });
    }

    if (!user.isActive) {
      throw new AppError({
        status: 403,
        code: ErrorCodes.AUTH_USER_DISABLED,
        message: 'User disabled',
      });
    }

    const ok = await verifyPassword(params.password, user.passwordHash);
    if (!ok) {
      throw new AppError({
        status: 401,
        code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
        message: 'Invalid credentials',
      });
    }

    const token = this.jwt.signAccessToken({
      sub: user.id,
      ver: user.tokenVersion,
      role: user.role,
    });
    const session = await this.sessions.createSession({
      userId: user.id,
      userAgent: params.userAgent,
      ip: params.ip,
    });

    return {
      token,
      refresh_token: session.refreshToken,
      user: toApiUser(user),
    };
  }

  async refresh(params: { refreshToken: string }) {
    const rotated = await this.sessions.rotateSession(params.refreshToken);
    const user = await this.users.findById(rotated.userId);
    if (!user || !user.isActive) {
      throw new AppError({
        status: 401,
        code: ErrorCodes.AUTH_REFRESH_INVALID,
        message: 'Invalid refresh token',
      });
    }

    const token = this.jwt.signAccessToken({
      sub: user.id,
      ver: user.tokenVersion,
      role: user.role,
    });

    return {
      token,
      refresh_token: rotated.refreshToken,
      user: toApiUser(user),
    };
  }

  async logout(userId: string) {
    await this.sessions.revokeAllForUser(userId);
    return { success: true };
  }
}
