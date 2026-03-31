import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

import type { Prisma } from '../generated/prisma/client';
import { UserRole, UserStatus } from '../generated/prisma/client';
import { ErrorCodes } from '../common/errors/error-codes';
import { PrismaService } from '../common/prisma/prisma.service';

import type { JwtAccessPayload } from './auth.types';

function isPrismaKnownRequestError(value: unknown): value is Prisma.PrismaClientKnownRequestError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof (value as { code: unknown }).code === 'string'
  );
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async hashPassword(rawPassword: string): Promise<string> {
    return bcrypt.hash(rawPassword, 10);
  }

  async verifyPassword(rawPassword: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(rawPassword, passwordHash);
  }

  private getJwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET') ?? 'dev-secret-change-me';
  }

  private getJwtExpiresIn(): string {
    return this.configService.get<string>('JWT_EXPIRES_IN') ?? '15m';
  }

  signAccessToken(user: { id: string; role: UserRole }): string {
    const payload: JwtAccessPayload = {
      sub: user.id,
      role: user.role,
    };

    const expiresIn = this.getJwtExpiresIn() as jwt.SignOptions['expiresIn'];

    return jwt.sign(payload, this.getJwtSecret(), {
      expiresIn,
    });
  }

  verifyAccessToken(token: string): JwtAccessPayload {
    const decoded = jwt.verify(token, this.getJwtSecret());

    if (typeof decoded !== 'object' || decoded === null) {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Invalid token.',
      });
    }

    const sub = (decoded as { sub?: unknown }).sub;
    const role = (decoded as { role?: unknown }).role;

    if (typeof sub !== 'string') {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Invalid token payload.',
      });
    }

    if (role !== UserRole.USER && role !== UserRole.PROVIDER && role !== UserRole.ADMIN) {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Invalid token payload.',
      });
    }

    return {
      sub,
      role,
      iat: (decoded as { iat?: number }).iat,
      exp: (decoded as { exp?: number }).exp,
    };
  }

  async findActiveUserById(userId: string) {
    return this.prisma.user.findFirst({
      where: {
        id: userId,
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async registerUser(input: { email: string; password: string; role: UserRole }) {
    const passwordHash = await this.hashPassword(input.password);

    try {
      return await this.prisma.user.create({
        data: {
          email: input.email,
          passwordHash,
          role: input.role,
          status: UserStatus.ACTIVE,
        },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
      });
    } catch (err: unknown) {
      if (isPrismaKnownRequestError(err) && err.code === 'P2002') {
        throw new ConflictException({
          code: ErrorCodes.AUTH_EMAIL_EXISTS,
          message: 'Email already exists.',
        });
      }
      throw err;
    }
  }

  async validateLogin(input: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
        message: 'Invalid credentials.',
      });
    }

    const ok = await this.verifyPassword(input.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
        message: 'Invalid credentials.',
      });
    }

    return user;
  }

  async register(input: { email: string; password: string; role: UserRole }) {
    const user = await this.registerUser(input);
    const accessToken = this.signAccessToken({ id: user.id, role: user.role });
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    };
  }

  async login(input: { email: string; password: string }) {
    const user = await this.validateLogin(input);

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_USER_SUSPENDED,
        message: 'User is suspended.',
      });
    }

    const accessToken = this.signAccessToken({ id: user.id, role: user.role });
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    };
  }
}
