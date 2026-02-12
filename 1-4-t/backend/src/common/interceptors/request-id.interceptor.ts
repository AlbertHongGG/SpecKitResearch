import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import { randomUUID } from 'crypto'
import type { Request, Response } from 'express'
import { Observable } from 'rxjs'

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp()
    const request = http.getRequest<Request & { requestId?: string }>()
    const response = http.getResponse<Response>()

    const incoming = request.header('x-request-id')
    const requestId = incoming && incoming.trim().length > 0 ? incoming : randomUUID()

    request.requestId = requestId
    response.setHeader('x-request-id', requestId)

    return next.handle()
  }
}
