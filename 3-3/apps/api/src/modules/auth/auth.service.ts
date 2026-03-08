import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../db/prisma.service';
import { AppError } from '../../common/app-error';
import { hashPassword, verifyPassword } from './password';
import { UsersRepo } from '../users/users.repo';

export const signUpSchema = z.object({
  email: z.string().email().transform((s) => s.toLowerCase().trim()),
  password: z.string().min(8),
  organizationName: z.string().min(1).max(100),
});

export const loginSchema = z.object({
  email: z.string().email().transform((s) => s.toLowerCase().trim()),
  password: z.string().min(1),
});

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersRepo,
  ) {}

  async signUp(input: z.infer<typeof signUpSchema>) {
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new AppError({
        errorCode: 'CONFLICT',
        status: 409,
        message: 'Email already in use',
      });
    }

    const passwordHash = await hashPassword(input.password);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await this.users.createUser({ email: input.email, passwordHash, isPlatformAdmin: false }, tx);

      const org = await tx.organization.create({ data: { name: input.organizationName } });

      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: 'ORG_ADMIN',
          status: 'ACTIVE',
        },
      });

      // Default subscription: Free-monthly
      const now = new Date();
      const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

      await tx.subscription.create({
        data: {
          organizationId: org.id,
          planId: 'Free-monthly',
          status: 'Active',
          billingCycle: 'monthly',
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          isCurrent: true,
        },
      });

      return { user, org };
    });

    return result;
  }

  async login(input: z.infer<typeof loginSchema>) {
    const user = await this.users.findByEmail(input.email);
    if (!user) {
      throw new AppError({ errorCode: 'AUTH_REQUIRED', status: 401, message: 'Invalid credentials' });
    }

    const ok = await verifyPassword(user.passwordHash, input.password);
    if (!ok) {
      throw new AppError({ errorCode: 'AUTH_REQUIRED', status: 401, message: 'Invalid credentials' });
    }

    await this.users.touchLastLogin(user.id);

    return user;
  }
}
