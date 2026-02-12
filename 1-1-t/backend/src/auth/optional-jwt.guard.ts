import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  // Allow missing/invalid token without throwing
  handleRequest(
    _err: unknown,
    user: any,
    _info: unknown,
    _ctx: ExecutionContext,
  ) {
    return user ?? null;
  }
}
