import { ConsoleLogger, Injectable } from '@nestjs/common';

import { getRequestContext } from './request-context.middleware';

@Injectable()
export class AppLoggerService extends ConsoleLogger {
  override log(message: unknown, context?: string): void {
    super.log(this.stringify(message), context ?? this.contextWithRequestId());
  }

  override error(message: unknown, stack?: string, context?: string): void {
    super.error(this.stringify(message), stack, context ?? this.contextWithRequestId());
  }

  override warn(message: unknown, context?: string): void {
    super.warn(this.stringify(message), context ?? this.contextWithRequestId());
  }

  override debug(message: unknown, context?: string): void {
    super.debug(this.stringify(message), context ?? this.contextWithRequestId());
  }

  private contextWithRequestId(): string {
    return `request:${getRequestContext().requestId}`;
  }

  private stringify(message: unknown): string {
    if (typeof message === 'string') {
      return message;
    }

    return JSON.stringify(message);
  }
}
