import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { getEnv } from '../../common/config/env'

export type AccessTokenPayload = {
  sub: string
  role: 'Customer' | 'Agent' | 'Admin'
}

@Injectable()
export class AppJwtService {
  constructor(private readonly jwt: JwtService) {}

  signAccessToken(payload: AccessTokenPayload): string {
    const env = getEnv()
    return this.jwt.sign(payload, {
      secret: env.JWT_ACCESS_SECRET,
      // jsonwebtoken@9 uses a constrained StringValue type; env values are runtime strings.
      expiresIn: env.JWT_ACCESS_TTL as any,
    })
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    const env = getEnv()
    return this.jwt.verify<AccessTokenPayload>(token, {
      secret: env.JWT_ACCESS_SECRET,
    })
  }
}
