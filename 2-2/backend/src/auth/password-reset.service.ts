import { createHash, randomBytes } from 'node:crypto'

import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common'

import { ErrorCodes } from '../common/errors/error-codes'
import { PrismaService } from '../common/db/prisma.service'
import { EMAIL_SENDER, type EmailSender } from './email-sender'
import { hashPassword } from './password'
import { PasswordResetRepo } from './password-reset.repo'

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: PasswordResetRepo,
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }

  async requestPasswordReset(input: { email: string }) {
    const email = typeof input.email === 'string' ? input.email.trim() : ''
    if (!email) return

    const user = await this.repo.findUserByEmail(email)
    if (!user) {
      // Always succeed to avoid account enumeration.
      return
    }

    const token = randomBytes(32).toString('hex')
    const tokenHash = this.hashToken(token)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)

    await this.repo.createToken({ userId: user.id, tokenHash, expiresAt })
    await this.emailSender.sendPasswordResetEmail({ toEmail: email, resetToken: token })
  }

  async confirmPasswordReset(input: { token: string; newPassword: string }) {
    const token = typeof input.token === 'string' ? input.token.trim() : ''
    const newPassword = typeof input.newPassword === 'string' ? input.newPassword : ''
    if (!token || !newPassword) {
      throw new BadRequestException({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Invalid request body',
      })
    }

    const tokenHash = this.hashToken(token)
    const record = await this.repo.findTokenByHash(tokenHash)
    if (!record) {
      throw new ConflictException({
        code: ErrorCodes.RESET_TOKEN_INVALID,
        message: 'Reset token is invalid',
      })
    }

    const now = new Date()
    if (record.usedAt) {
      throw new ConflictException({
        code: ErrorCodes.RESET_TOKEN_USED,
        message: 'Reset token has been used',
      })
    }

    if (now.getTime() > record.expiresAt.getTime()) {
      throw new ConflictException({
        code: ErrorCodes.RESET_TOKEN_EXPIRED,
        message: 'Reset token is expired',
      })
    }

    const newPasswordHash = await hashPassword(newPassword)

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash: newPasswordHash },
      })
      await tx.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: now } })
    })
  }
}
