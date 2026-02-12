import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';

@Controller('auth')
export class CsrfController {
  @Get('csrf')
  getCsrf(@Res({ passthrough: true }) res: Response) {
    const csrfToken = randomUUID();
    res.cookie('csrf', csrfToken, {
      httpOnly: false,
      sameSite: 'lax',
      secure: false,
      path: '/',
    });
    return { csrfToken };
  }
}
