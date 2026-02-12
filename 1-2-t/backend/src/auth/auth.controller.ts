import {
  Body,
  Controller,
  Post,
  Res,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      throw new UnprocessableEntityException({
        code: 'validation_error',
        message: 'Invalid request body',
        details: parsed.error.flatten(),
      });
    }
    return this.authService.login(res, parsed.data.email, parsed.data.password);
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    return this.authService.logout(res);
  }
}
