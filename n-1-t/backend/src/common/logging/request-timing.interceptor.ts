import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class RequestTimingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startedAt = Date.now();
    const http = context.switchToHttp();
    const req: any = http.getRequest();

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - startedAt;
          if (req?.log?.info) {
            req.log.info({ ms, path: req.originalUrl, method: req.method }, 'request.completed');
          }
        },
        error: (err) => {
          const ms = Date.now() - startedAt;
          if (req?.log?.error) {
            req.log.error({ ms, path: req.originalUrl, method: req.method, err }, 'request.failed');
          }
        },
      }),
    );
  }
}
