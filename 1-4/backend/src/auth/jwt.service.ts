import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { env } from '../common/config/env';
import { JwtPayload } from './jwt-payload';

@Injectable()
export class JwtTokenService {
  constructor(private readonly jwt: JwtService) {}

  signAccessToken(payload: JwtPayload) {
    return this.jwt.sign(payload, {
      secret: env.JWT_SECRET,
      expiresIn: env.JWT_ACCESS_TTL_SECONDS,
    });
  }
}
