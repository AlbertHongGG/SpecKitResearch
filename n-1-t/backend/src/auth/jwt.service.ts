import jwt from 'jsonwebtoken';
import { Injectable } from '@nestjs/common';
import type { UserRole } from '@prisma/client';

import { env } from '../config/env';

type TokenPayload = {
  sub: string;
  role: UserRole;
};

@Injectable()
export class JwtService {
  sign(userId: string, role: UserRole): string {
    const payload: TokenPayload = { sub: userId, role };
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });
  }

  verify(token: string): TokenPayload {
    return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  }
}
