import { Injectable } from '@nestjs/common'
import type { StringValue } from 'ms'

@Injectable()
export class AppConfigService {
  get port(): number {
    return Number(process.env.PORT ?? 3000)
  }

  get tz(): string {
    return process.env.TZ ?? 'Asia/Taipei'
  }

  get databaseUrl(): string {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('Missing DATABASE_URL')
    return url
  }

  get jwtSecret(): string {
    const secret = process.env.JWT_SECRET
    if (!secret) throw new Error('Missing JWT_SECRET')
    return secret
  }

  get jwtExpiresIn(): StringValue {
    return (process.env.JWT_EXPIRES_IN ?? '7d') as StringValue
  }

  get corsOrigin(): string {
    return process.env.CORS_ORIGIN ?? 'http://localhost:5173'
  }
}
