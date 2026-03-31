import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';

import { ErrorCodes } from '../common/errors/error-codes';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private getExpiryMinutes(): number {
    const raw = this.configService.get<string>('PASSWORD_RESET_EXPIRES_MINUTES');
    const num = raw ? Number(raw) : 30;
    return Number.isFinite(num) && num > 0 ? num : 30;
  }

  private generateRawToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  /**
   * Returns the raw token for delivery (e.g. email). Caller should not expose it in API responses.
   * Returns null when the email does not exist (to avoid user enumeration).
   */
  async createResetTokenForEmail(email: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) return null;

    const rawToken = this.generateRawToken();
    const tokenHash = this.hashToken(rawToken);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.getExpiryMinutes() * 60_000);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    return rawToken;
  }

  async resetPassword(input: { token: string; newPasswordHash: string }): Promise<void> {
    const tokenHash = this.hashToken(input.token);
    const now = new Date();

    const record = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: {
          gte: now,
        },
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!record) {
      throw new UnauthorizedException({
        code: ErrorCodes.PASSWORD_RESET_INVALID,
        message: 'Invalid or expired token.',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash: input.newPasswordHash },
      });

      await tx.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: now },
      });
    });
  }
}
