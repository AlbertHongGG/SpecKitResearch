import { Body, Controller, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(
    @Body() body: { email: string; password: string; organizationName: string },
    @Req() req: any,
  ) {
    const result = await this.authService.signup(body);
    req.session.userId = result.user.id;
    return result;
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }, @Req() req: any) {
    const result = await this.authService.login(body.email, body.password);
    req.session.userId = result.id;
    return {
      userId: result.id,
      email: result.email,
      isPlatformAdmin: result.isPlatformAdmin,
      organizationIds: result.organizationIds,
    };
  }

  @Post('logout')
  logout(@Req() req: any) {
    req.session.destroy(() => undefined);
    return { ok: true };
  }
}
