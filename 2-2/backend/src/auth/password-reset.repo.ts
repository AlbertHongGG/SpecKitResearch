import { Injectable } from '@nestjs/common'

import { PrismaService } from '../common/db/prisma.service'

@Injectable()
export class PasswordResetRepo {
  constructor(private readonly prisma: PrismaService) {}

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } })
  }

  createToken(input: { userId: string; tokenHash: string; expiresAt: Date }) {
    return this.prisma.passwordResetToken.create({
      data: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
      },
    })
  }

  findTokenByHash(tokenHash: string) {
    return this.prisma.passwordResetToken.findFirst({
      where: { tokenHash },
      include: { user: true },
    })
  }

  markTokenUsed(tokenId: string, usedAt: Date) {
    return this.prisma.passwordResetToken.update({
      where: { id: tokenId },
      data: { usedAt },
    })
  }

  updateUserPasswordHash(userId: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    })
  }
}
