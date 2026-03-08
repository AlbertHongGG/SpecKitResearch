import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from './logger.service';

@Injectable()
export class TracingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const started = Date.now();
    return next.handle().pipe(
      tap(() => {
        this.logger.info('request.completed', {
          requestId: request.requestId,
          traceId: request.traceId,
          correlationId: request.correlationId,
          path: request.path,
          method: request.method,
          latencyMs: Date.now() - started,
        });
      }),
    );
  }
}
