import type { NextFunction, Request, Response } from 'express'
import { Injectable, NestMiddleware } from '@nestjs/common'

import { ensureRequestId } from './response'

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    ensureRequestId(req, res)
    next()
  }
}
