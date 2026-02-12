import { ConsoleLogger, Injectable } from '@nestjs/common';

@Injectable()
export class AppLogger extends ConsoleLogger {
  withContext(context: string) {
    this.setContext(context);
    return this;
  }
}
