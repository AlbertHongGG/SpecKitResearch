import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role } from '@prisma/client';
import { ErrorCodes } from '../common/errors/error-codes';
import { PrismaService } from '../common/prisma/prisma.service';
import { hashPassword, verifyPassword } from './password';

export type AuthResponse = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    createdAt: string;
  };
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private signToken(user: { id: string; role: Role }): string {
    return this.jwt.sign({ sub: user.id, role: user.role });
  }

  async register(input: {
    email: string;
    name: string;
    password: string;
  }): Promise<AuthResponse> {
    try {
      const user = await this.prisma.user.create({
        data: {
          email: input.email,
          name: input.name,
          role: Role.member,
          passwordHash: await hashPassword(input.password),
        },
      });

      return {
        token: this.signToken(user),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt.toISOString(),
        },
      };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException({
          code: ErrorCodes.CONFLICT,
          message: 'Email already exists',
        });
      }
      throw err;
    }
  }

  async login(input: { email: string; password: string }): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: ErrorCodes.INVALID_CREDENTIALS,
        message: 'Invalid credentials',
      });
    }

    const ok = await verifyPassword(input.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException({
        code: ErrorCodes.INVALID_CREDENTIALS,
        message: 'Invalid credentials',
      });
    }

    return {
      token: this.signToken(user),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      },
    };
  }
}
