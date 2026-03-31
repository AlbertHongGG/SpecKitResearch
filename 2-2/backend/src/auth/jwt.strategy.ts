import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

import type { UserRole, UserStatus } from '@prisma/client'
import { env } from '../common/config/env'

export type JwtPayload = {
  sub: string
  role: UserRole
  status: UserStatus
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.JWT_SECRET,
    })
  }

  async validate(payload: JwtPayload) {
    return { id: payload.sub, role: payload.role, status: payload.status }
  }
}
