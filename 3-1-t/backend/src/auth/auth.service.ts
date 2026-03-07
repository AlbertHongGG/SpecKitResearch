import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';

import { PrismaService } from '../prisma/prisma.service';
import type { LoginBody, SignupBody } from './auth.schemas';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async signup(payload: SignupBody) {
    const passwordHash = await bcrypt.hash(payload.password, 12);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: payload.email.toLowerCase().trim(),
          passwordHash,
          roleAssignments: {
            create: {
              role: 'BUYER',
            },
          },
        },
        include: {
          roleAssignments: true,
        },
      });

      return {
        id: user.id,
        email: user.email,
        roles: user.roleAssignments.map(
          (roleAssignment) => roleAssignment.role,
        ),
      };
    } catch {
      throw new ConflictException('Email already in use');
    }
  }

  async login(payload: LoginBody) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: payload.email.toLowerCase().trim(),
      },
      include: {
        roleAssignments: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(payload.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      id: user.id,
      email: user.email,
      roles: user.roleAssignments.map((roleAssignment) => roleAssignment.role),
    };
  }
}
