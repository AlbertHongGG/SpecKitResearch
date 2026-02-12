import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type RequestUser = { id: string; role: string };

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): RequestUser => {
    const req = ctx.switchToHttp().getRequest();
    return req.user;
});
