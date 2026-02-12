import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';

@Injectable()
export class CsrfService {
  getOrCreateToken(req: Request): string {
    if (!req.session.csrfToken) req.session.csrfToken = `csrf_${randomUUID()}`;
    return req.session.csrfToken;
  }

  assertValid(req: Request) {
    const expected = req.session.csrfToken;
    const provided = req.header('x-csrf-token');
    if (!expected || !provided || provided !== expected) {
      throw new UnauthorizedException('CSRF token missing or invalid');
    }
  }
}
