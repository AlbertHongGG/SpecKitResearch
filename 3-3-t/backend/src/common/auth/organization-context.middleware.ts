import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class OrganizationContextMiddleware implements NestMiddleware {
  use(req: Request & { orgId?: string }, _res: Response, next: NextFunction) {
    req.orgId = req.headers['x-organization-id'] as string | undefined;
    next();
  }
}
