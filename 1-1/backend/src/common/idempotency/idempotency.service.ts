import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { makeError } from '../http/error-response'

export type IdempotencyReplay = { status: number; body: unknown }

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  async claim(params: {
    userId: string
    action: string
    key: string
    requestHash?: string
  }): Promise<{ replay: IdempotencyReplay | null; recordId: string }> {
    const { userId, action, key, requestHash } = params

    try {
      const created = await this.prisma.idempotencyKey.create({
        data: {
          userId,
          action,
          key,
          requestHash,
        },
      })
      return { replay: null, recordId: created.id }
    } catch {
      const existing = await this.prisma.idempotencyKey.findUnique({
        where: {
          userId_action_key: { userId, action, key },
        },
      })

      if (!existing) {
        throw new HttpException(
          makeError('CONFLICT', 'Idempotency conflict'),
          HttpStatus.CONFLICT,
        )
      }

      if (requestHash && existing.requestHash && requestHash !== existing.requestHash) {
        throw new HttpException(
          makeError('IDEMPOTENCY_KEY_REUSE', 'Idempotency key reused with different request'),
          HttpStatus.CONFLICT,
        )
      }

      if (existing.responseStatus != null && existing.responseBody != null) {
        return {
          replay: { status: existing.responseStatus, body: existing.responseBody },
          recordId: existing.id,
        }
      }

      throw new HttpException(
        makeError('IDEMPOTENCY_IN_PROGRESS', 'Request is already being processed'),
        HttpStatus.CONFLICT,
      )
    }
  }

  async storeResult(params: {
    recordId: string
    status: number
    body: unknown
  }): Promise<void> {
    const { recordId, status, body } = params
    await this.prisma.idempotencyKey.update({
      where: { id: recordId },
      data: {
        responseStatus: status,
        responseBody: body as any,
      },
    })
  }
}
