import { HttpStatus } from '@nestjs/common'
import type { ErrorCode } from './error-codes'

export class DomainError extends Error {
  public readonly code: ErrorCode | string
  public readonly status: number

  constructor(params: { code: ErrorCode | string; message: string; status?: number }) {
    super(params.message)
    this.code = params.code
    this.status = params.status ?? HttpStatus.BAD_REQUEST
  }
}
