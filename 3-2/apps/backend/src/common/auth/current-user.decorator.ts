import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { RequestWithUser } from './session.guard.js';

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<RequestWithUser>();
  return req.user;
});
